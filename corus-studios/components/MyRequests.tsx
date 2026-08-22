"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { useRouter } from "next/navigation";

import {
  CalendarDays,
  Clock3,
  FileText,
  RefreshCw,
  Plus,
  CreditCard,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ReceiptText,
  ExternalLink,
  X,
  Loader2,
} from "lucide-react";

import { useAuthState } from "@/lib/use-signed-in-user";

import {
  Reservation,
  STATUS_LABELS,
  STATUS_TONE,
  formatRequestDate,
  formatRequestTime,
} from "@/lib/reservations";

import api from "@/lib/api";

import styles from "./MyRequests.module.css";

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:8000";

/* =========================================================
   PAYMENT TYPES
========================================================= */

type PaymentState =
  | "idle"
  | "preparing"
  | "waiting"
  | "success"
  | "error";

type ReceiptData = {
  receiptNumber: string | null;
  amount: number;
  issuedAt: string | null;
};

type PaymentInfo = {
  reference: string;
  authorizationUrl: string;
  amount: number;
  balanceDue: number;
};

/* =========================================================
   HELPERS
========================================================= */

function formatMoney(
  value:
    | string
    | number
    | null
    | undefined
) {
  const amount = Number(value);

  if (!Number.isFinite(amount)) {
    return "GH₵0.00";
  }

  return `GH₵${amount.toLocaleString(
    "en-GH",
    {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }
  )}`;
}

function formatDateTime(
  value:
    | string
    | null
    | undefined
) {
  if (!value) {
    return "—";
  }

  const date = new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return "—";
  }

  return date.toLocaleDateString(
    "en-GH",
    {
      day: "numeric",
      month: "short",
      year: "numeric",
    }
  );
}

function normalizeStatus(
  status:
    | string
    | null
    | undefined
) {
  return (
    status
      ?.toLowerCase()
      .replace(
        /[_-]+/g,
        " "
      ) || ""
  );
}

function getReadableStatus(
  status:
    | string
    | null
    | undefined
) {
  if (!status) {
    return "Pending";
  }

  return status
    .replace(
      /[_-]+/g,
      " "
    )
    .replace(
      /\b\w/g,
      (letter) =>
        letter.toUpperCase()
    );
}

function getErrorMessage(
  data: unknown,
  fallback: string
) {
  if (
    typeof data ===
      "string" &&
    data.trim()
  ) {
    return data;
  }

  if (
    data &&
    typeof data ===
      "object"
  ) {
    const value =
      data as {
        detail?: unknown;
        message?: unknown;
        error?: {
          message?: unknown;
        };
      };

    if (
      Array.isArray(
        value.detail
      )
    ) {
      const messages =
        value.detail
          .map(
            (item) => {
              if (
                item &&
                typeof item ===
                  "object" &&
                "msg" in item &&
                typeof (
                  item as {
                    msg?: unknown;
                  }
                ).msg ===
                  "string"
              ) {
                return (
                  item as {
                    msg: string;
                  }
                ).msg;
              }

              return null;
            }
          )
          .filter(
            (
              item
            ): item is string =>
              Boolean(item)
          );

      if (
        messages.length
      ) {
        return messages.join(
          ", "
        );
      }
    }

    if (
      typeof value.detail ===
      "string"
    ) {
      return value.detail;
    }

    if (
      typeof value.message ===
      "string"
    ) {
      return value.message;
    }

    if (
      typeof value.error
        ?.message ===
      "string"
    ) {
      return value.error
        .message;
    }
  }

  return fallback;
}

async function readResponse(
  response: Response
) {
  const text =
    await response.text();

  if (!text) {
    return null;
  }

  try {
    return JSON.parse(
      text
    );
  } catch {
    return text;
  }
}

function isPaymentSuccessful(
  data: any
) {
  const status =
    normalizeStatus(
      data?.status
    );

  if (
    [
      "success",
      "successful",
      "paid",
      "completed",
      "verified",
    ].includes(
      status
    )
  ) {
    return true;
  }

  if (
    data?.receipt ||
    data?.receipt_number
  ) {
    return true;
  }

  return false;
}

/* =========================================================
   COMPONENT
========================================================= */

export default function MyRequests() {
  const router =
    useRouter();

  const auth =
    useAuthState();

  const [
    reservations,
    setReservations,
  ] =
    useState<Reservation[]>(
      []
    );

  const [
    loading,
    setLoading,
  ] =
    useState(true);

  const [
    error,
    setError,
  ] =
    useState<string | null>(
      null
    );

  /* =========================================================
     PAYMENT STATE
  ========================================================= */

  const [
    paymentState,
    setPaymentState,
  ] =
    useState<PaymentState>(
      "idle"
    );

  const [
    paymentReservation,
    setPaymentReservation,
  ] =
    useState<
      Reservation | null
    >(null);

  const [
    paymentInfo,
    setPaymentInfo,
  ] =
    useState<
      PaymentInfo | null
    >(null);

  const [
    receipt,
    setReceipt,
  ] =
    useState<
      ReceiptData | null
    >(null);

  const [
    paymentError,
    setPaymentError,
  ] =
    useState<string | null>(
      null
    );

  const paymentWindowRef =
    useRef<Window | null>(
      null
    );

  const paymentTimerRef =
    useRef<
      ReturnType<
        typeof setInterval
      > | null
    >(null);

  const paymentAttemptsRef =
    useRef(0);

  /* =========================================================
     CLEAN PAYMENT POLLING
  ========================================================= */

  const stopPaymentPolling =
    useCallback(() => {
      if (
        paymentTimerRef.current
      ) {
        clearInterval(
          paymentTimerRef.current
        );

        paymentTimerRef.current =
          null;
      }

      paymentAttemptsRef.current =
        0;
    }, []);

  useEffect(() => {
    return () => {
      stopPaymentPolling();

      try {
        if (
          paymentWindowRef.current &&
          !paymentWindowRef.current.closed
        ) {
          paymentWindowRef.current.close();
        }
      } catch {
        // Ignore browser restrictions.
      }
    };
  }, [
    stopPaymentPolling,
  ]);

  /* =========================================================
     FETCH RESERVATIONS
  ========================================================= */

  const fetchReservations =
    useCallback(
      async (
        showLoader = true
      ) => {
        const token =
          localStorage.getItem(
            "access_token"
          );

        if (!token) {
          setError(
            "Please log in to view your requests."
          );

          setLoading(false);

          return;
        }

        try {
          if (
            showLoader
          ) {
            setLoading(
              true
            );
          }

          setError(
            null
          );

          const response =
            await api.reservations.myReservations(
              token
            );

          if (
            response.status ===
            401
          ) {
            localStorage.removeItem(
              "access_token"
            );

            localStorage.removeItem(
              "user"
            );

            router.push(
              "/login"
            );

            return;
          }

          const data =
            await readResponse(
              response
            );

          if (
            !response.ok
          ) {
            throw new Error(
              getErrorMessage(
                data,
                `Failed to fetch reservations (${response.status}).`
              )
            );
          }

          setReservations(
            Array.isArray(
              data
            )
              ? data
              : []
          );
        } catch (
          err
        ) {
          console.error(
            "MY REQUESTS FAILED:",
            err
          );

          setError(
            err instanceof
              Error
              ? err.message
              : "Something went wrong."
          );
        } finally {
          setLoading(
            false
          );
        }
      },
      [router]
    );

  useEffect(() => {
    if (
      auth.status ===
      "checking"
    ) {
      return;
    }

    if (
      auth.status ===
      "signed-out"
    ) {
      setLoading(
        false
      );

      return;
    }

    fetchReservations();
  }, [
    auth.status,
    fetchReservations,
  ]);

  /* =========================================================
     START PAYMENT
  ========================================================= */

  const startPayment =
    async (
      reservation: Reservation
    ) => {
      const token =
        localStorage.getItem(
          "access_token"
        );

      if (!token) {
        router.push(
          "/login"
        );

        return;
      }

      /*
       * Open the tab immediately from the user interaction.
       * This avoids popup blockers after the async API request.
       */
      let paymentWindow:
        | Window
        | null =
        null;

      try {
        paymentWindow =
          window.open(
            "about:blank",
            "_blank",
            "noopener,noreferrer"
          );

        if (
          paymentWindow
        ) {
          paymentWindowRef.current =
            paymentWindow;
        }
      } catch {
        paymentWindow =
          null;
      }

      try {
        stopPaymentPolling();

        setPaymentReservation(
          reservation
        );

        setPaymentInfo(
          null
        );

        setReceipt(
          null
        );

        setPaymentError(
          null
        );

        setPaymentState(
          "preparing"
        );

        const response =
          await api.reservations.checkout(
            reservation.id,
            token
          );

        const data =
          await readResponse(
            response
          );

        if (
          response.status ===
          401
        ) {
          localStorage.removeItem(
            "access_token"
          );

          localStorage.removeItem(
            "user"
          );

          if (
            paymentWindow &&
            !paymentWindow.closed
          ) {
            paymentWindow.close();
          }

          router.push(
            "/login"
          );

          return;
        }

        if (
          !response.ok
        ) {
          throw new Error(
            getErrorMessage(
              data,
              `Unable to prepare payment (${response.status}).`
            )
          );
        }

        const authorizationUrl =
          data?.authorization_url ||
          data?.authorizationUrl;

        const reference =
          data?.reference ||
          data?.paystack_reference;

        if (
          !authorizationUrl
        ) {
          throw new Error(
            "The payment page could not be prepared because no Paystack authorization URL was returned."
          );
        }

        if (
          !reference
        ) {
          throw new Error(
            "The payment page was prepared, but no payment reference was returned."
          );
        }

        const amount =
          Number(
            data?.amount_ghs ??
              reservation.approved_price_ghs ??
              0
          );

        const balanceDue =
          Number(
            data?.balance_due_ghs ??
              reservation.balance_due_ghs ??
              0
          );

        const info: PaymentInfo =
          {
            authorizationUrl,
            reference,
            amount:
              Number.isFinite(
                amount
              )
                ? amount
                : 0,
            balanceDue:
              Number.isFinite(
                balanceDue
              )
                ? balanceDue
                : 0,
          };

        setPaymentInfo(
          info
        );

        /*
         * Send the already-opened tab to Paystack.
         */
        if (
          paymentWindow &&
          !paymentWindow.closed
        ) {
          try {
            paymentWindow.location.href =
              authorizationUrl;
          } catch {
            // The modal still has an "Open Paystack" button.
          }
        }

        setPaymentState(
          "waiting"
        );

        startPaymentPolling(
          reference,
          token
        );
      } catch (
        err
      ) {
        console.error(
          "STUDIO REQUEST PAYMENT FAILED:",
          err
        );

        try {
          if (
            paymentWindow &&
            !paymentWindow.closed
          ) {
            paymentWindow.close();
          }
        } catch {
          // Ignore.
        }

        setPaymentState(
          "error"
        );

        setPaymentError(
          err instanceof
            Error
            ? err.message
            : "Unable to start payment."
        );
      }
    };

  /* =========================================================
     POLL PAYMENT
  ========================================================= */

  const startPaymentPolling =
    (
      reference: string,
      token: string
    ) => {
      stopPaymentPolling();

      paymentAttemptsRef.current =
        0;

      const verify =
        async () => {
          paymentAttemptsRef.current +=
            1;

          /*
           * Five minutes maximum.
           */
          if (
            paymentAttemptsRef.current >
            100
          ) {
            stopPaymentPolling();

            setPaymentState(
              "error"
            );

            setPaymentError(
              "We couldn't confirm the payment yet. Please check your payment status or try again."
            );

            return;
          }

          try {
            const response =
              await fetch(
                `${API_BASE}/payments/verify/${encodeURIComponent(
                  reference
                )}`,
                {
                  method:
                    "GET",

                  headers: {
                    Authorization:
                      `Bearer ${token}`,

                    Accept:
                      "application/json",
                  },

                  cache:
                    "no-store",
                }
              );

            const data =
              await readResponse(
                response
              );

            if (
              response.status ===
              401
            ) {
              stopPaymentPolling();

              localStorage.removeItem(
                "access_token"
              );

              localStorage.removeItem(
                "user"
              );

              setPaymentState(
                "error"
              );

              setPaymentError(
                "Your session has expired. Please log in again."
              );

              return;
            }

            /*
             * Payment may not have been processed by the
             * backend immediately. Keep polling.
             */
            if (
              response.status ===
                404 ||
              response.status ===
                409
            ) {
              return;
            }

            if (
              !response.ok
            ) {
              console.warn(
                "PAYMENT VERIFICATION RESPONSE:",
                response.status,
                data
              );

              return;
            }

            if (
              isPaymentSuccessful(
                data
              )
            ) {
              stopPaymentPolling();

              const receiptObject =
                data?.receipt;

              setReceipt(
                {
                  receiptNumber:
                    data?.receipt_number ||
                    receiptObject?.receipt_number ||
                    null,

                  amount:
                    Number(
                      data?.amount_ghs ??
                        receiptObject?.amount_ghs ??
                        paymentInfo?.amount ??
                        0
                    ) || 0,

                  issuedAt:
                    data?.issued_at ||
                    receiptObject?.issued_at ||
                    null,
                }
              );

              setPaymentState(
                "success"
              );

              /*
               * Refresh the reservation status so the card
               * changes from Approved/Pending Payment to
               * the latest backend state.
               */
              window.setTimeout(
                () => {
                  fetchReservations(
                    false
                  );
                },
                800
              );

              return;
            }

            /*
             * No success yet — continue polling.
             */
          } catch (
            verificationError
          ) {
            /*
             * A temporary network error should not immediately
             * tell the customer their payment failed.
             */
            console.warn(
              "PAYMENT VERIFY POLL FAILED:",
              verificationError
            );
          }
        };

      void verify();

      paymentTimerRef.current =
        setInterval(
          () => {
            void verify();
          },
          3000
        );
    };

  /* =========================================================
     CLOSE PAYMENT MODAL
  ========================================================= */

  const closePaymentModal =
    () => {
      stopPaymentPolling();

      setPaymentState(
        "idle"
      );

      setPaymentReservation(
        null
      );

      setPaymentInfo(
        null
      );

      setReceipt(
        null
      );

      setPaymentError(
        null
      );
    };

  /* =========================================================
     REOPEN PAYSTACK
  ========================================================= */

  const reopenPaystack =
    () => {
      if (
        !paymentInfo
          ?.authorizationUrl
      ) {
        return;
      }

      const reopened =
        window.open(
          paymentInfo.authorizationUrl,
          "_blank",
          "noopener,noreferrer"
        );

      if (
        reopened
      ) {
        paymentWindowRef.current =
          reopened;
      }
    };

  /* =========================================================
     FORMAT SUBMITTED DATE
  ========================================================= */

  const formatSubmittedDate =
    (
      value:
        | string
        | undefined
    ) => {
      if (!value) {
        return "Date unavailable";
      }

      const date =
        new Date(value);

      if (
        Number.isNaN(
          date.getTime()
        )
      ) {
        return "Date unavailable";
      }

      return date.toLocaleDateString(
        "en-GH",
        {
          day: "numeric",
          month: "short",
          year: "numeric",
        }
      );
    };

  /* =========================================================
     LOADING
  ========================================================= */

  if (
    auth.status ===
      "checking" ||
    loading
  ) {
    return (
      <div
        className={
          styles.page
        }
      >
        <header
          className={
            styles.header
          }
        >
          <div>
            <span
              className={
                styles.eyebrow
              }
            >
              Studio
            </span>

            <h1
              className={
                styles.heading
              }
            >
              My Requests
            </h1>

            <p
              className={
                styles.subheading
              }
            >
              Your studio space requests
            </p>
          </div>
        </header>

        <div
          className={
            styles.stateCard
          }
          role="status"
        >
          <div
            className={
              styles.spinner
            }
          />

          <h2>
            Loading your requests
          </h2>

          <p>
            Please wait while we
            retrieve your studio
            requests.
          </p>
        </div>
      </div>
    );
  }

  /* =========================================================
     SIGNED OUT
  ========================================================= */

  if (
    auth.status ===
    "signed-out"
  ) {
    return (
      <div
        className={
          styles.page
        }
      >
        <header
          className={
            styles.header
          }
        >
          <div>
            <span
              className={
                styles.eyebrow
              }
            >
              Studio
            </span>

            <h1
              className={
                styles.heading
              }
            >
              My Requests
            </h1>

            <p
              className={
                styles.subheading
              }
            >
              Your studio space requests
            </p>
          </div>
        </header>

        <div
          className={
            styles.stateCard
          }
        >
          <div
            className={
              styles.stateIcon
            }
          >
            <FileText
              size={28}
            />
          </div>

          <h2>
            Sign in required
          </h2>

          <p>
            Log in to see the studio
            requests you have submitted
            and their current status.
          </p>

          <Link
            href="/login"
            className={
              styles.primaryButton
            }
          >
            Log In
          </Link>
        </div>
      </div>
    );
  }

  /* =========================================================
     ERROR
  ========================================================= */

  if (
    error
  ) {
    return (
      <div
        className={
          styles.page
        }
      >
        <header
          className={
            styles.header
          }
        >
          <div>
            <span
              className={
                styles.eyebrow
              }
            >
              Studio
            </span>

            <h1
              className={
                styles.heading
              }
            >
              My Requests
            </h1>

            <p
              className={
                styles.subheading
              }
            >
              Your studio space requests
            </p>
          </div>
        </header>

        <div
          className={`${styles.stateCard} ${styles.errorCard}`}
        >
          <div
            className={
              styles.errorIcon
            }
          >
            !
          </div>

          <h2>
            Unable to load requests
          </h2>

          <p>
            {error}
          </p>

          <button
            type="button"
            className={
              styles.secondaryButton
            }
            onClick={() =>
              fetchReservations()
            }
          >
            <RefreshCw
              size={15}
            />

            Try Again
          </button>
        </div>
      </div>
    );
  }

  /* =========================================================
     EMPTY
  ========================================================= */

  if (
    reservations.length ===
    0
  ) {
    return (
      <div
        className={
          styles.page
        }
      >
        <header
          className={
            styles.header
          }
        >
          <div>
            <span
              className={
                styles.eyebrow
              }
            >
              Studio
            </span>

            <h1
              className={
                styles.heading
              }
            >
              My Requests
            </h1>

            <p
              className={
                styles.subheading
              }
            >
              Your studio space requests
            </p>
          </div>
        </header>

        <div
          className={
            styles.stateCard
          }
        >
          <div
            className={
              styles.stateIcon
            }
          >
            <CalendarDays
              size={28}
            />
          </div>

          <h2>
            No requests yet
          </h2>

          <p>
            When you request a studio
            space, your request and its
            status will appear here.
          </p>

          <Link
            href="/rentals/studio"
            className={
              styles.primaryButton
            }
          >
            <Plus
              size={16}
            />

            Request a Studio
          </Link>
        </div>
      </div>
    );
  }

  /* =========================================================
     REQUEST LIST
  ========================================================= */

  return (
    <>
      <div
        className={
          styles.page
        }
      >
        <header
          className={
            styles.header
          }
        >
          <div>
            <span
              className={
                styles.eyebrow
              }
            >
              Studio
            </span>

            <h1
              className={
                styles.heading
              }
            >
              My Requests
            </h1>

            <p
              className={
                styles.subheading
              }
            >
              View the studio requests
              you have submitted.
            </p>
          </div>

          <div
            className={
              styles.headerActions
            }
          >
            <button
              type="button"
              className={
                styles.refreshButton
              }
              onClick={() =>
                fetchReservations(
                  false
                )
              }
            >
              <RefreshCw
                size={14}
              />

              Refresh
            </button>

            <Link
              href="/rentals/studio"
              className={
                styles.headerButton
              }
            >
              <Plus
                size={16}
              />

              New Request
            </Link>
          </div>
        </header>

        <div
          className={
            styles.list
          }
        >
          {reservations.map(
            (request) => {
              const tone =
                STATUS_TONE[
                  request.status
                ] ||
                "waiting";

              const statusLabel =
                STATUS_LABELS[
                  request.status
                ] ||
                getReadableStatus(
                  request.status
                );

              const normalized =
                normalizeStatus(
                  request.status
                );

              const approved =
                normalized ===
                  "approved" ||
                normalized ===
                  "pending payment" ||
                normalized ===
                  "payment pending";

              const paid =
                Boolean(
                  request.paystack_reference
                ) &&
                !normalized.includes(
                  "pending"
                ) &&
                !normalized.includes(
                  "approved"
                );

              const approvedPrice =
                Number(
                  request.approved_price_ghs
                ) || 0;

              const deposit =
                Number(
                  request.deposit_amount_ghs
                ) || 0;

              const balanceDue =
                Number(
                  request.balance_due_ghs
                ) || 0;

              const showPayment =
                approved &&
                !paid;

              return (
                <article
                  key={
                    request.id
                  }
                  className={`${styles.card} ${
                    showPayment
                      ? styles.cardApproved
                      : ""
                  }`}
                >
                  {/* =========================================
                      CARD HEADER
                  ========================================= */}

                  <div
                    className={
                      styles.cardTop
                    }
                  >
                    <div
                      className={
                        styles.cardIcon
                      }
                    >
                      <FileText
                        size={20}
                      />
                    </div>

                    <div
                      className={
                        styles.cardTitleArea
                      }
                    >
                      <span
                        className={
                          styles.cardLabel
                        }
                      >
                        Studio Request
                      </span>

                      <h2
                        className={
                          styles.purpose
                        }
                      >
                        {request.purpose ||
                          "Studio request"}
                      </h2>
                    </div>

                    <span
                      className={`${styles.badge} ${styles[tone]}`}
                    >
                      {normalized ===
                      "approved" ? (
                        <>
                          <CheckCircle2
                            size={12}
                          />

                          Approved
                        </>
                      ) : normalized.includes(
                          "rejected"
                        ) ? (
                        <>
                          <XCircle
                            size={12}
                          />

                          {statusLabel}
                        </>
                      ) : (
                        statusLabel
                      )}
                    </span>
                  </div>

                  {/* =========================================
                      DATE / TIME
                  ========================================= */}

                  <div
                    className={
                      styles.cardDetails
                    }
                  >
                    <div
                      className={
                        styles.detail
                      }
                    >
                      <CalendarDays
                        size={16}
                      />

                      <div>
                        <span
                          className={
                            styles.detailLabel
                          }
                        >
                          Requested date
                        </span>

                        <strong>
                          {formatRequestDate(
                            request.requested_start
                          )}
                        </strong>
                      </div>
                    </div>

                    <div
                      className={
                        styles.detail
                      }
                    >
                      <Clock3
                        size={16}
                      />

                      <div>
                        <span
                          className={
                            styles.detailLabel
                          }
                        >
                          Requested time
                        </span>

                        <strong>
                          {formatRequestTime(
                            request.requested_start
                          )}{" "}
                          -{" "}
                          {formatRequestTime(
                            request.requested_end
                          )}
                        </strong>
                      </div>
                    </div>
                  </div>

                  {/* =========================================
                      APPROVED PRICE
                  ========================================= */}

                  {approved &&
                    approvedPrice >
                      0 && (
                      <div
                        className={
                          styles.paymentPanel
                        }
                      >
                        <div
                          className={
                            styles.paymentHeader
                          }
                        >
                          <div>
                            <span
                              className={
                                styles.paymentEyebrow
                              }
                            >
                              Approved Booking
                            </span>

                            <h3>
                              Payment details
                            </h3>
                          </div>

                          <span
                            className={
                              styles.approvedCheck
                            }
                          >
                            <CheckCircle2
                              size={15}
                            />

                            Approved
                          </span>
                        </div>

                        <div
                          className={
                            styles.amountGrid
                          }
                        >
                          <div
                            className={
                              styles.amountItem
                            }
                          >
                            <span>
                              Approved price
                            </span>

                            <strong>
                              {formatMoney(
                                approvedPrice
                              )}
                            </strong>
                          </div>

                          <div
                            className={
                              styles.amountItem
                            }
                          >
                            <span>
                              Deposit
                            </span>

                            <strong>
                              {formatMoney(
                                deposit
                              )}
                            </strong>
                          </div>

                          <div
                            className={
                              styles.amountItem
                            }
                          >
                            <span>
                              Balance due
                            </span>

                            <strong
                              className={
                                styles.balance
                              }
                            >
                              {formatMoney(
                                balanceDue
                              )}
                            </strong>
                          </div>
                        </div>

                        {request.payment_deadline && (
                          <div
                            className={
                              styles.paymentDeadline
                            }
                          >
                            <Clock3
                              size={14}
                            />

                            <span>
                              Payment deadline:
                            </span>

                            <strong>
                              {formatDateTime(
                                request.payment_deadline
                              )}
                            </strong>
                          </div>
                        )}

                        {showPayment ? (
                          <div
                            className={
                              styles.paymentAction
                            }
                          >
                            <div
                              className={
                                styles.paymentActionText
                              }
                            >
                              <CreditCard
                                size={17}
                              />

                              <div>
                                <strong>
                                  Your request
                                  has been
                                  approved
                                </strong>

                                <span>
                                  Complete your
                                  payment to
                                  confirm the
                                  booking.
                                </span>
                              </div>
                            </div>

                            <button
                              type="button"
                              className={
                                styles.payButton
                              }
                              onClick={() =>
                                startPayment(
                                  request
                                )
                              }
                            >
                              <CreditCard
                                size={16}
                              />

                              Pay Now
                            </button>
                          </div>
                        ) : (
                          request.paystack_reference && (
                            <div
                              className={
                                styles.paidNotice
                              }
                            >
                              <CheckCircle2
                                size={16}
                              />

                              <div>
                                <strong>
                                  Payment received
                                </strong>

                                <span>
                                  Reference:{" "}
                                  {
                                    request.paystack_reference
                                  }
                                </span>
                              </div>

                              <Link
                                href="/receipts"
                                className={
                                  styles.receiptButton
                                }
                              >
                                <ReceiptText
                                  size={14}
                                />

                                View Receipt
                              </Link>
                            </div>
                          )
                        )}
                      </div>
                    )}

                  {/* =========================================
                      NOTES
                  ========================================= */}

                  {request.notes && (
                    <div
                      className={
                        styles.notes
                      }
                    >
                      <span>
                        Notes
                      </span>

                      <p>
                        {
                          request.notes
                        }
                      </p>
                    </div>
                  )}

                  {/* =========================================
                      REJECTION
                  ========================================= */}

                  {request.rejection_reason && (
                    <div
                      className={
                        styles.rejection
                      }
                    >
                      <div
                        className={
                          styles.rejectionTitle
                        }
                      >
                        <XCircle
                          size={15}
                        />

                        <strong>
                          Request not approved
                        </strong>
                      </div>

                      <p>
                        {
                          request.rejection_reason
                        }
                      </p>
                    </div>
                  )}

                  {/* =========================================
                      FOOTER
                  ========================================= */}

                  <div
                    className={
                      styles.cardFooter
                    }
                  >
                    <span>
                      Submitted
                    </span>

                    <span>
                      {formatSubmittedDate(
                        request.created_at
                      )}
                    </span>
                  </div>
                </article>
              );
            }
          )}
        </div>
      </div>

      {/* =======================================================
          PAYMENT MODAL
      ======================================================= */}

      {paymentState !==
        "idle" && (
        <div
          className={
            styles.modalOverlay
          }
          role="presentation"
        >
          <div
            className={
              styles.paymentModal
            }
            role="dialog"
            aria-modal="true"
            aria-labelledby="payment-modal-title"
          >
            {/* ===============================================
                PREPARING
            =============================================== */}

            {paymentState ===
              "preparing" && (
              <>
                <div
                  className={`${styles.modalIcon} ${styles.modalLoading}`}
                >
                  <Loader2
                    size={28}
                    className={
                      styles.spin
                    }
                  />
                </div>

                <h2
                  id="payment-modal-title"
                >
                  Preparing your payment
                </h2>

                <p
                  className={
                    styles.modalText
                  }
                >
                  We're preparing your
                  Paystack payment page.
                </p>

                <div
                  className={
                    styles.modalLoadingBox
                  }
                >
                  <span>
                    Please wait...
                  </span>
                </div>
              </>
            )}

            {/* ===============================================
                WAITING
            =============================================== */}

            {paymentState ===
              "waiting" &&
              paymentInfo && (
                <>
                  <button
                    type="button"
                    className={
                      styles.modalClose
                    }
                    onClick={
                      closePaymentModal
                    }
                    aria-label="Close payment window"
                  >
                    <X
                      size={18}
                    />
                  </button>

                  <div
                    className={`${styles.modalIcon} ${styles.modalWaiting}`}
                  >
                    <Loader2
                      size={28}
                      className={
                        styles.spin
                      }
                    />
                  </div>

                  <h2
                    id="payment-modal-title"
                  >
                    Waiting for payment
                  </h2>

                  <p
                    className={
                      styles.modalText
                    }
                  >
                    Paystack has been
                    opened in a new tab.
                    Complete your payment
                    there and we'll
                    automatically check for
                    confirmation.
                  </p>

                  <div
                    className={
                      styles.modalSummary
                    }
                  >
                    <div>
                      <span>
                        Amount
                      </span>

                      <strong>
                        {formatMoney(
                          paymentInfo.amount
                        )}
                      </strong>
                    </div>

                    <div>
                      <span>
                        Reference
                      </span>

                      <strong>
                        {
                          paymentInfo.reference
                        }
                      </strong>
                    </div>
                  </div>

                  <div
                    className={
                      styles.verificationBox
                    }
                  >
                    <Loader2
                      size={16}
                      className={
                        styles.spin
                      }
                    />

                    <span>
                      Waiting for payment
                      confirmation...
                    </span>
                  </div>

                  <button
                    type="button"
                    className={
                      styles.openPaystackButton
                    }
                    onClick={
                      reopenPaystack
                    }
                  >
                    <ExternalLink
                      size={15}
                    />

                    Open Paystack Again
                  </button>

                  <button
                    type="button"
                    className={
                      styles.modalSecondary
                    }
                    onClick={
                      closePaymentModal
                    }
                  >
                    Close
                  </button>
                </>
              )}

            {/* ===============================================
                SUCCESS
            =============================================== */}

            {paymentState ===
              "success" && (
              <>
                <div
                  className={`${styles.modalIcon} ${styles.modalSuccess}`}
                >
                  <CheckCircle2
                    size={30}
                  />
                </div>

                <h2
                  id="payment-modal-title"
                >
                  Payment successful
                </h2>

                <p
                  className={
                    styles.modalText
                  }
                >
                  Your studio booking payment
                  has been confirmed.
                </p>

                <div
                  className={
                    styles.successBox
                  }
                >
                  <div>
                    <span>
                      Amount paid
                    </span>

                    <strong>
                      {formatMoney(
                        receipt?.amount ||
                          paymentInfo?.amount ||
                          0
                      )}
                    </strong>
                  </div>

                  {receipt?.receiptNumber && (
                    <div>
                      <span>
                        Receipt number
                      </span>

                      <strong>
                        {
                          receipt.receiptNumber
                        }
                      </strong>
                      </div>
                  )}

                  {receipt?.issuedAt && (
                    <div>
                      <span>
                        Issued
                      </span>

                      <strong>
                        {formatDateTime(
                          receipt.issuedAt
                        )}
                      </strong>
                    </div>
                  )}
                </div>

                <div
                  className={
                    styles.modalActions
                  }
                >
                  <Link
                    href="/receipts"
                    className={
                      styles.receiptButtonLarge
                    }
                    onClick={
                      closePaymentModal
                    }
                  >
                    <ReceiptText
                      size={16}
                    />

                    View Receipt
                  </Link>

                  <button
                    type="button"
                    className={
                      styles.modalSecondary
                    }
                    onClick={
                      closePaymentModal
                    }
                  >
                    Done
                  </button>
                </div>
              </>
            )}

            {/* ===============================================
                ERROR
            =============================================== */}

            {paymentState ===
              "error" && (
              <>
                <div
                  className={`${styles.modalIcon} ${styles.modalError}`}
                >
                  <AlertTriangle
                    size={28}
                  />
                </div>

                <h2
                  id="payment-modal-title"
                >
                  Payment could not be confirmed
                </h2>

                <p
                  className={
                    styles.modalText
                  }
                >
                  {paymentError ||
                    "Something went wrong while processing the payment."}
                </p>

                {paymentInfo?.authorizationUrl && (
                  <button
                    type="button"
                    className={
                      styles.payButtonFull
                    }
                    onClick={() => {
                      setPaymentState(
                        "waiting"
                      );

                      setPaymentError(
                        null
                      );

                      const token =
                        localStorage.getItem(
                          "access_token"
                        );

                      if (
                        token &&
                        paymentInfo.reference
                      ) {
                        reopenPaystack();

                        startPaymentPolling(
                          paymentInfo.reference,
                          token
                        );
                      }
                    }}
                  >
                    <ExternalLink
                      size={16}
                    />

                    Try Payment Again
                  </button>
                )}

                <button
                  type="button"
                  className={
                    styles.modalSecondary
                  }
                  onClick={
                    closePaymentModal
                  }
                >
                  Close
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}