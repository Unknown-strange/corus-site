"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import Image from "next/image";
import Link from "next/link";

import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  Clock3,
  CreditCard,
  Loader2,
  ShieldCheck,
  ShoppingBag,
  XCircle,
  Printer,
  ReceiptText,
  AlertTriangle,
  ExternalLink,
} from "lucide-react";

import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

import api from "@/lib/api";

import type {
  CartResponse,
} from "@/lib/types";

import styles from "./page.module.css";

type CheckoutMode =
  | "store"
  | "rental"
  | "booking";

type PaymentState =
  | "idle"
  | "waiting"
  | "success"
  | "error";

type ReceiptInfo = {
  id?: string;
  receipt_number?: string;
  receipt_type?: string;
  amount_ghs?: string;
  issued_at?: string;
};

type PaymentResult = {
  reference?: string;
  receipt?: ReceiptInfo | null;
  message?: string;
};

type RentalCheckoutData = {
  equipment_id: string;
  equipment_name: string;
  image_url: string;
  daily_rate_ghs: string;
  start_date: string;
  end_date: string;
  pickup_time: string;
  dropoff_time: string;
};

type BookingCheckoutData = {
  hold_id: string;
  session_type_id: string;
  session_type_name: string;
  session_description: string;
  price_ghs: string;
  slot_id: string;
  slot_starts_at: string;
  slot_ends_at: string;
  saved_at?: number;
};

type CheckoutResponse = {
  booking_id?: string;
  rental_id?: string;
  order_id?: string;
  authorization_url?: string;
  reference?: string;
  public_key?: string;
  amount_ghs?: string;
};

type ErrorResponse = {
  detail?: unknown;
  message?: unknown;
  error?: {
    code?: unknown;
    message?: unknown;
  };
};

const PAYMENT_STORAGE_KEY =
  "corus_payment_result";

const CHECKOUT_INTENT_KEY =
  "corus_checkout_intent";

const BOOKING_STORAGE_KEY =
  "booking_checkout";

const RENTAL_STORAGE_KEY =
  "rental_checkout";

/* =========================================================
   HELPERS
========================================================= */

function parseResponseBody(
  rawBody: string
): unknown {
  if (!rawBody) {
    return null;
  }

  try {
    return JSON.parse(
      rawBody
    );
  } catch {
    return rawBody;
  }
}

function getErrorMessage(
  data: unknown,
  fallback: string
): string {
  if (
    typeof data === "string" &&
    data.trim()
  ) {
    return data;
  }

  if (
    data &&
    typeof data === "object"
  ) {
    const errorData =
      data as ErrorResponse;

    if (
      typeof errorData.detail ===
      "string"
    ) {
      return errorData.detail;
    }

    if (
      Array.isArray(
        errorData.detail
      )
    ) {
      const messages =
        errorData.detail
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
              message
            ): message is string =>
              Boolean(message)
          );

      if (
        messages.length > 0
      ) {
        return messages.join(
          ", "
        );
      }
    }

    if (
      typeof errorData.message ===
      "string"
    ) {
      return errorData.message;
    }

    if (
      typeof errorData.error
        ?.message ===
      "string"
    ) {
      return errorData.error
        .message;
    }
  }

  return fallback;
}

function isHoldExpiredError(
  message: string
) {
  const value =
    message.toLowerCase();

  return (
    value.includes(
      "hold"
    ) &&
    (
      value.includes(
        "expired"
      ) ||
      value.includes(
        "expire"
      ) ||
      value.includes(
        "invalid"
      ) ||
      value.includes(
        "not found"
      )
    )
  );
}

function formatDate(
  value: string
) {
  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return value;
  }

  return date.toLocaleDateString(
    "en-GH",
    {
      weekday:
        "short",
      month:
        "short",
      day:
        "numeric",
      year:
        "numeric",
    }
  );
}

function formatMoney(
  value: number
) {
  return value.toLocaleString(
    "en-GH",
    {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }
  );
}

/* =========================================================
   PAGE
========================================================= */

export default function CheckoutPage() {
  const [
    mode,
    setMode,
  ] =
    useState<CheckoutMode | null>(
      null
    );

  const [
    cart,
    setCart,
  ] =
    useState<CartResponse | null>(
      null
    );

  const [
    rentalCheckout,
    setRentalCheckout,
  ] =
    useState<RentalCheckoutData | null>(
      null
    );

  const [
    bookingCheckout,
    setBookingCheckout,
  ] =
    useState<BookingCheckoutData | null>(
      null
    );

  const [
    loading,
    setLoading,
  ] =
    useState(true);

  const [
    paying,
    setPaying,
  ] =
    useState(false);

  const [
    error,
    setError,
  ] =
    useState<string | null>(
      null
    );

  const [
    paymentState,
    setPaymentState,
  ] =
    useState<PaymentState>(
      "idle"
    );

  const [
    paymentReference,
    setPaymentReference,
  ] =
    useState("");

  const [
    paymentResult,
    setPaymentResult,
  ] =
    useState<PaymentResult | null>(
      null
    );

  /* =========================================================
     LOAD CONTEXT
  ========================================================= */

  useEffect(() => {
    let mounted = true;

    const loadCheckout =
      async () => {
        try {
          const intent =
            sessionStorage.getItem(
              CHECKOUT_INTENT_KEY
            );

          /* =============================================
             BOOKING
          ============================================= */

          if (
            intent ===
            "booking"
          ) {
            try {
              const raw =
                sessionStorage.getItem(
                  BOOKING_STORAGE_KEY
                );

              if (
                raw
              ) {
                const parsed =
                  JSON.parse(
                    raw
                  ) as BookingCheckoutData;

                if (
                  parsed.hold_id
                ) {
                  if (
                    mounted
                  ) {
                    setBookingCheckout(
                      parsed
                    );

                    setMode(
                      "booking"
                    );

                    setLoading(
                      false
                    );
                  }

                  return;
                }
              }
            } catch {
              sessionStorage.removeItem(
                BOOKING_STORAGE_KEY
              );
            }

            sessionStorage.removeItem(
              CHECKOUT_INTENT_KEY
            );
          }

          /* =============================================
             RENTAL
          ============================================= */

          if (
            intent ===
            "rental"
          ) {
            try {
              const raw =
                sessionStorage.getItem(
                  RENTAL_STORAGE_KEY
                );

              if (
                raw
              ) {
                const parsed =
                  JSON.parse(
                    raw
                  ) as RentalCheckoutData;

                if (
                  parsed.equipment_id
                ) {
                  if (
                    mounted
                  ) {
                    setRentalCheckout(
                      parsed
                    );

                    setMode(
                      "rental"
                    );

                    setLoading(
                      false
                    );
                  }

                  return;
                }
              }
            } catch {
              sessionStorage.removeItem(
                RENTAL_STORAGE_KEY
              );
            }

            sessionStorage.removeItem(
              CHECKOUT_INTENT_KEY
            );
          }

          /* =============================================
             STORE
          ============================================= */

          const token =
            localStorage.getItem(
              "access_token"
            );

          if (
            !token
          ) {
            if (
              mounted
            ) {
              setError(
                "Please log in to continue."
              );

              setLoading(
                false
              );
            }

            return;
          }

          const response =
            await api.cart.get(
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

            window.location.href =
              "/login";

            return;
          }

          const rawBody =
            await response.text();

          const data =
            parseResponseBody(
              rawBody
            );

          if (
            !response.ok
          ) {
            throw new Error(
              getErrorMessage(
                data,
                "Unable to load your cart."
              )
            );
          }

          if (
            mounted
          ) {
            setCart(
              data as CartResponse
            );

            setMode(
              "store"
            );
          }
        } catch (
          err
        ) {
          console.error(
            "CHECKOUT CONTEXT LOAD FAILED:",
            err
          );

          if (
            mounted
          ) {
            setError(
              err instanceof
                Error
                ? err.message
                : "Unable to load checkout."
            );
          }
        } finally {
          if (
            mounted
          ) {
            setLoading(
              false
            );
          }
        }
      };

    loadCheckout();

    return () => {
      mounted = false;
    };
  }, []);

  /* =========================================================
     PAYMENT RESULT
  ========================================================= */

  useEffect(() => {
    const applyPaymentResult =
      (
        value: unknown
      ) => {
        if (
          !value ||
          typeof value !==
            "object"
        ) {
          return;
        }

        const data =
          value as {
            status?: string;
            reference?: string;
            receipt?: ReceiptInfo | null;
            message?: string;
          };

        if (
          !data.status
        ) {
          return;
        }

        if (
          data.reference
        ) {
          setPaymentReference(
            data.reference
          );
        }

        setPaymentResult({
          reference:
            data.reference,

          receipt:
            data.receipt,

          message:
            data.message,
        });

        if (
          data.status ===
          "success"
        ) {
          setPaymentState(
            "success"
          );

          setPaying(
            false
          );

          sessionStorage.removeItem(
            BOOKING_STORAGE_KEY
          );

          sessionStorage.removeItem(
            RENTAL_STORAGE_KEY
          );

          sessionStorage.removeItem(
            CHECKOUT_INTENT_KEY
          );

          setError(
            null
          );
        }

        if (
          data.status ===
          "error"
        ) {
          setPaymentState(
            "error"
          );

          setPaying(
            false
          );

          setError(
            data.message ||
              "Payment verification failed."
          );
        }
      };

    const handleMessage =
      (
        event: MessageEvent
      ) => {
        if (
          event.origin !==
          window.location.origin
        ) {
          return;
        }

        if (
          event.data?.type !==
          "CORUS_PAYMENT_RESULT"
        ) {
          return;
        }

        applyPaymentResult({
          ...(event.data
            ?.result &&
          typeof event.data
            .result ===
            "object"
            ? event.data
                .result
            : {}),

          status:
            event.data.status,
        });
      };

    const handleStorage =
      (
        event: StorageEvent
      ) => {
        if (
          event.key !==
            PAYMENT_STORAGE_KEY ||
          !event.newValue
        ) {
          return;
        }

        try {
          applyPaymentResult(
            JSON.parse(
              event.newValue
            )
          );
        } catch {
          // Ignore malformed storage.
        }
      };

    try {
      const existing =
        localStorage.getItem(
          PAYMENT_STORAGE_KEY
        );

      if (
        existing
      ) {
        const parsed =
          JSON.parse(
            existing
          );

        if (
          parsed?.saved_at &&
          Date.now() -
            parsed.saved_at <
            10 * 60 * 1000
        ) {
          applyPaymentResult(
            parsed
          );
        } else {
          localStorage.removeItem(
            PAYMENT_STORAGE_KEY
          );
        }
      }
    } catch {
      // Ignore storage errors.
    }

    window.addEventListener(
      "message",
      handleMessage
    );

    window.addEventListener(
      "storage",
      handleStorage
    );

    return () => {
      window.removeEventListener(
        "message",
        handleMessage
      );

      window.removeEventListener(
        "storage",
        handleStorage
      );
    };
  }, []);

  /* =========================================================
     PROCEED
  ========================================================= */

  const proceedToPayment =
    async () => {
      const token =
        localStorage.getItem(
          "access_token"
        );

      if (
        !token
      ) {
        setError(
          "Please log in to continue."
        );

        return;
      }

      if (
        !mode
      ) {
        setError(
          "No checkout session was found."
        );

        return;
      }

      try {
        setPaying(
          true
        );

        setError(
          null
        );

        setPaymentResult(
          null
        );

        setPaymentState(
          "idle"
        );

        let response:
          Response;

        /* =============================================
           BOOKING
        ============================================= */

        if (
          mode ===
          "booking"
        ) {
          if (
            !bookingCheckout
          ) {
            throw new Error(
              "Your booking checkout session is no longer available. Please choose your date and time again."
            );
          }

          response =
            await api.sessions.checkoutBooking(
              {
                hold_id:
                  bookingCheckout.hold_id,
              },
              token
            );
        }

        /* =============================================
           RENTAL
        ============================================= */

        else if (
          mode ===
          "rental"
        ) {
          if (
            !rentalCheckout
          ) {
            throw new Error(
              "Your rental checkout information is missing. Please select the rental again."
            );
          }

          response =
            await api.rentals.checkout(
              {
                equipment_id:
                  rentalCheckout.equipment_id,

                start_date:
                  rentalCheckout.start_date,

                end_date:
                  rentalCheckout.end_date,
              },
              token
            );
        }

        /* =============================================
           STORE
        ============================================= */

        else {
          if (
            !cart ||
            cart.items.length ===
              0
          ) {
            throw new Error(
              "Your store cart is empty."
            );
          }

          response =
            await api.orders.checkout(
              token
            );
        }

        const rawBody =
          await response.text();

        const data =
          parseResponseBody(
            rawBody
          );

        console.log(
          "CHECKOUT RESPONSE",
          {
            mode,
            status:
              response.status,
            data,
          }
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

          window.location.href =
            "/login";

          return;
        }

        if (
          !response.ok
        ) {
          const message =
            getErrorMessage(
              data,
              `Checkout failed (${response.status}).`
            );

          /*
           * This is important for expired booking holds.
           */
          if (
            mode ===
              "booking" &&
            isHoldExpiredError(
              message
            )
          ) {
            sessionStorage.removeItem(
              BOOKING_STORAGE_KEY
            );

            sessionStorage.removeItem(
              CHECKOUT_INTENT_KEY
            );

            setBookingCheckout(
              null
            );

            setError(
              "Your booking hold has expired. Please return to the booking page and choose the date and time again."
            );

            setPaying(
              false
            );

            return;
          }

          throw new Error(
            message
          );
        }

        if (
          !data ||
          typeof data !==
            "object"
        ) {
          throw new Error(
            "The checkout server returned an invalid response."
          );
        }

        const checkout =
          data as CheckoutResponse;

        if (
          !checkout.authorization_url
        ) {
          throw new Error(
            "The server completed checkout but did not return a Paystack authorization URL."
          );
        }

        if (
          checkout.reference
        ) {
          setPaymentReference(
            checkout.reference
          );
        }

        /*
         * Clear the booking hold from session storage
         * once the backend has successfully accepted it.
         * The payment reference is now our source of truth.
         */
        if (
          mode ===
          "booking"
        ) {
          sessionStorage.removeItem(
            BOOKING_STORAGE_KEY
          );
        }

        if (
          mode ===
          "rental"
        ) {
          sessionStorage.removeItem(
            RENTAL_STORAGE_KEY
          );
        }

        /*
         * Do not clear the store cart here because the backend
         * order is what controls the cart state.
         */

        setPaymentState(
          "waiting"
        );

        const paymentWindow =
          window.open(
            checkout.authorization_url,
            "_blank"
          );

        if (
          !paymentWindow
        ) {
          throw new Error(
            "Your browser blocked the Paystack payment window. Please allow pop-ups for this site."
          );
        }

        paymentWindow.focus();
      } catch (
        err
      ) {
        console.error(
          "PAYMENT START FAILED:",
          err
        );

        setPaymentState(
          "error"
        );

        setError(
          err instanceof
            Error
            ? err.message
            : "Unable to start payment."
        );

        setPaying(
          false
        );
      }
    };

  /* =========================================================
     PRINT
  ========================================================= */

  const printReceipt =
    () => {
      const receipt =
        paymentResult?.receipt;

      if (
        !receipt
      ) {
        return;
      }

      const printWindow =
        window.open(
          "",
          "_blank",
          "width=700,height=800"
        );

      if (
        !printWindow
      ) {
        return;
      }

      const amount =
        receipt.amount_ghs
          ? Number(
              receipt.amount_ghs
            ).toLocaleString(
              "en-GH",
              {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              }
            )
          : "";

      printWindow.document.write(`
        <!doctype html>
        <html>
          <head>
            <title>Corus Studios Receipt</title>

            <style>
              body {
                font-family: Arial, Helvetica, sans-serif;
                padding: 40px;
                color: #111827;
              }

              .receipt {
                max-width: 560px;
                margin: 0 auto;
              }

              .brand {
                color: #ff5100;
                font-size: 12px;
                font-weight: 800;
                letter-spacing: 2px;
                text-transform: uppercase;
              }

              h1 {
                margin: 8px 0 6px;
                font-size: 28px;
              }

              .line {
                border-top: 1px solid #e5e7eb;
                margin: 20px 0;
              }

              .row {
                display: flex;
                justify-content: space-between;
                gap: 20px;
                padding: 9px 0;
              }

              .label {
                color: #667085;
              }

              .value {
                font-weight: 700;
                text-align: right;
                word-break: break-word;
              }

              .total {
                font-size: 19px;
              }
            </style>
          </head>

          <body>
            <div class="receipt">
              <div class="brand">
                Corus Studios
              </div>

              <h1>
                Payment Receipt
              </h1>

              <div class="line"></div>

              <div class="row">
                <span class="label">
                  Reference
                </span>

                <span class="value">
                  ${paymentReference || "N/A"}
                </span>
              </div>

              ${
                receipt.receipt_number
                  ? `
                    <div class="row">
                      <span class="label">
                        Receipt
                      </span>

                      <span class="value">
                        ${receipt.receipt_number}
                      </span>
                    </div>
                  `
                  : ""
              }

              ${
                amount
                  ? `
                    <div class="row total">
                      <span class="label">
                        Amount Paid
                      </span>

                      <span class="value">
                        GH₵${amount}
                      </span>
                    </div>
                  `
                  : ""
              }
            </div>
          </body>
        </html>
      `);

      printWindow.document.close();

      printWindow.focus();
      printWindow.print();
    };

  /* =========================================================
     CALCULATIONS
  ========================================================= */

  const storeTotal =
    Number.parseFloat(
      cart?.total_ghs ||
        "0"
    );

  const rentalRate =
    rentalCheckout
      ? Number.parseFloat(
          rentalCheckout.daily_rate_ghs
        )
      : 0;

  const rentalStart =
    rentalCheckout
      ? new Date(
          `${rentalCheckout.start_date}T00:00:00`
        )
      : null;

  const rentalEnd =
    rentalCheckout
      ? new Date(
          `${rentalCheckout.end_date}T00:00:00`
        )
      : null;

  const rentalDays =
    rentalStart &&
    rentalEnd
      ? Math.max(
          1,
          Math.ceil(
            (rentalEnd.getTime() -
              rentalStart.getTime()) /
              (1000 *
                60 *
                60 *
                24)
          )
        )
      : 1;

  const rentalTotal =
    rentalRate *
    rentalDays;

  const bookingPrice =
    bookingCheckout
      ? Number.parseFloat(
          bookingCheckout.price_ghs
        )
      : 0;

  /*
   * Important:
   *
   * The actual booking payment comes from the backend
   * response. This is only used for the review screen.
   */
  const bookingDeposit =
    50;

  const bookingBalance =
    Math.max(
      0,
      bookingPrice -
        bookingDeposit
    );

  /* =========================================================
     LABELS
  ========================================================= */

  const heading =
    mode ===
    "booking"
      ? "Review your booking"
      : mode ===
        "rental"
      ? "Review your rental"
      : "Complete your order";

  const subtitle =
    mode ===
    "booking"
      ? "Confirm your session details and secure your booking with the GH₵50 deposit."
      : mode ===
        "rental"
      ? "Confirm your rental details before continuing to payment."
      : "Review your products before continuing to secure payment.";

  /* =========================================================
     LOADING
  ========================================================= */

  if (
    loading
  ) {
    return (
      <>
        <Navbar />

        <main
          className={
            styles.page
          }
        >
          <div
            className={
              styles.loading
            }
          >
            Loading checkout...
          </div>
        </main>

        <Footer />
      </>
    );
  }

  /* =========================================================
     PAGE
  ========================================================= */

  return (
    <>
      <Navbar />

      <main
        className={
          styles.page
        }
      >
        <div
          className={
            styles.container
          }
        >
          <Link
            href={
              mode ===
              "booking"
                ? "/booking/session"
                : mode ===
                  "rental"
                ? "/rentals"
                : "/cart/carts?category=store"
            }
            className={
              styles.backLink
            }
          >
            <ArrowLeft
              size={17}
            />

            Back
          </Link>

          <header
            className={
              styles.header
            }
          >
            <span
              className={
                styles.eyebrow
              }
            >
              {mode ===
              "booking"
                ? "Booking Checkout"
                : mode ===
                  "rental"
                ? "Rental Checkout"
                : "Store Checkout"}
            </span>

            <h1>
              {heading}
            </h1>

            <p>
              {subtitle}
            </p>
          </header>

          {error && (
            <div
              className={
                styles.error
              }
            >
              <AlertTriangle
                size={16}
              />

              <span>
                {error}
              </span>

              {mode ===
                "booking" &&
                error
                  .toLowerCase()
                  .includes(
                    "hold"
                  ) && (
                  <Link
                    href="/booking/session"
                    className={
                      styles.errorAction
                    }
                  >
                    Book Again
                  </Link>
                )}
            </div>
          )}

          {/* =================================================
              BOOKING
          ================================================= */}

          {mode ===
            "booking" &&
            bookingCheckout && (
              <section
                className={
                  styles.layout
                }
              >
                <div
                  className={
                    styles.items
                  }
                >
                  <article
                    className={
                      styles.item
                    }
                  >
                    <div
                      className={
                        styles.bookingIcon
                      }
                    >
                      <CalendarDays
                        size={28}
                      />
                    </div>

                    <div
                      className={
                        styles.itemInfo
                      }
                    >
                      <span
                        className={
                          styles.itemType
                        }
                      >
                        Photography Session
                      </span>

                      <h2>
                        {
                          bookingCheckout.session_type_name
                        }
                      </h2>

                      <p>
                        {
                          bookingCheckout.session_description
                        }
                      </p>

                      <div
                        className={
                          styles.detailRow
                        }
                      >
                        <CalendarDays
                          size={14}
                        />

                        <span>
                          {formatDate(
                            bookingCheckout.slot_starts_at
                          )}
                        </span>
                      </div>

                      <div
                        className={
                          styles.detailRow
                        }
                      >
                        <Clock3
                          size={14}
                        />

                        <span>
                          {new Date(
                            bookingCheckout.slot_starts_at
                          ).toLocaleTimeString(
                            "en-US",
                            {
                              hour:
                                "2-digit",
                              minute:
                                "2-digit",
                            }
                          )}{" "}
                          -
                          {" "}
                          {new Date(
                            bookingCheckout.slot_ends_at
                          ).toLocaleTimeString(
                            "en-US",
                            {
                              hour:
                                "2-digit",
                              minute:
                                "2-digit",
                            }
                          )}
                        </span>
                      </div>
                    </div>

                    <strong
                      className={
                        styles.lineTotal
                      }
                    >
                      GH₵
                      {formatMoney(
                        bookingPrice
                      )}
                    </strong>
                  </article>
                </div>

                <aside
                  className={
                    styles.summary
                  }
                >
                  <div
                    className={
                      styles.summaryHeader
                    }
                  >
                    <h2>
                      Booking Summary
                    </h2>

                    <ShieldCheck
                      size={21}
                      color="#ff5100"
                    />
                  </div>

                  <div
                    className={
                      styles.summaryRow
                    }
                  >
                    <span>
                      Session
                    </span>

                    <strong>
                      {
                        bookingCheckout.session_type_name
                      }
                    </strong>
                  </div>

                  <div
                    className={
                      styles.summaryRow
                    }
                  >
                    <span>
                      Total price
                    </span>

                    <strong>
                      GH₵
                      {formatMoney(
                        bookingPrice
                      )}
                    </strong>
                  </div>

                  <div
                    className={
                      styles.summaryRow
                    }
                  >
                    <span>
                      Booking deposit
                    </span>

                    <strong
                      className={
                        styles.depositAmount
                      }
                    >
                      GH₵50.00
                    </strong>
                  </div>

                  <div
                    className={
                      styles.summaryRow
                    }
                  >
                    <span>
                      Balance after payment
                    </span>

                    <strong>
                      GH₵
                      {formatMoney(
                        bookingBalance
                      )}
                    </strong>
                  </div>

                  <div
                    className={
                      styles.divider
                    }
                  />

                  <div
                    className={
                      styles.payNowNotice
                    }
                  >
                    <CreditCard
                      size={16}
                    />

                    <span>
                      You only pay
                      <strong>
                        GH₵50.00
                      </strong>
                      now to secure this
                      booking.
                    </span>
                  </div>

                  <button
                    type="button"
                    className={
                      styles.paymentButton
                    }
                    onClick={
                      proceedToPayment
                    }
                    disabled={
                      paying
                    }
                  >
                    <CreditCard
                      size={18}
                    />

                    {paying
                      ? "Preparing Payment..."
                      : "Proceed to Payment — GH₵50"}
                  </button>
                </aside>
              </section>
            )}

          {/* =================================================
              RENTAL
          ================================================= */}

          {mode ===
            "rental" &&
            rentalCheckout && (
              <section
                className={
                  styles.layout
                }
              >
                <div
                  className={
                    styles.items
                  }
                >
                  <article
                    className={
                      styles.item
                    }
                  >
                    <div
                      className={
                        styles.imageWrap
                      }
                    >
                      <Image
                        src={
                          rentalCheckout.image_url ||
                          "/images/placeholder.png"
                        }
                        alt={
                          rentalCheckout.equipment_name
                        }
                        fill
                        sizes="105px"
                        className={
                          styles.image
                        }
                      />
                    </div>

                    <div
                      className={
                        styles.itemInfo
                      }
                    >
                      <span
                        className={
                          styles.itemType
                        }
                      >
                        Rental Equipment
                      </span>

                      <h2>
                        {
                          rentalCheckout.equipment_name
                        }
                      </h2>

                      <div
                        className={
                          styles.detailRow
                        }
                      >
                        <CalendarDays
                          size={14}
                        />

                        <span>
                          {formatDate(
                            rentalCheckout.start_date
                          )}{" "}
                          -{" "}
                          {formatDate(
                            rentalCheckout.end_date
                          )}
                        </span>
                      </div>

                      <div
                        className={
                          styles.detailRow
                        }
                      >
                        <Clock3
                          size={14}
                        />

                        <span>
                          {
                            rentalCheckout.pickup_time
                          }{" "}
                          -
                          {" "}
                          {
                            rentalCheckout.dropoff_time
                          }
                        </span>
                      </div>
                    </div>

                    <strong
                      className={
                        styles.lineTotal
                      }
                    >
                      GH₵
                      {formatMoney(
                        rentalTotal
                      )}
                    </strong>
                  </article>
                </div>

                <aside
                  className={
                    styles.summary
                  }
                >
                  <div
                    className={
                      styles.summaryHeader
                    }
                  >
                    <h2>
                      Rental Summary
                    </h2>

                    <ShieldCheck
                      size={21}
                      color="#ff5100"
                    />
                  </div>

                  <div
                    className={
                      styles.summaryRow
                    }
                  >
                    <span>
                      Daily rate
                    </span>

                    <strong>
                      GH₵
                      {formatMoney(
                        rentalRate
                      )}
                    </strong>
                  </div>

                  <div
                    className={
                      styles.summaryRow
                    }
                  >
                    <span>
                      Rental days
                    </span>

                    <strong>
                      {
                        rentalDays
                      }
                    </strong>
                  </div>

                  <div
                    className={
                      styles.divider
                    }
                  />

                  <div
                    className={
                      styles.grandTotal
                    }
                  >
                    <span>
                      Estimated Total
                    </span>

                    <strong>
                      GH₵
                      {formatMoney(
                        rentalTotal
                      )}
                    </strong>
                  </div>

                  <button
                    type="button"
                    className={
                      styles.paymentButton
                    }
                    onClick={
                      proceedToPayment
                    }
                    disabled={
                      paying
                    }
                  >
                    <CreditCard
                      size={18}
                    />

                    {paying
                      ? "Preparing Payment..."
                      : "Proceed to Payment"}
                  </button>
                </aside>
              </section>
            )}

          {/* =================================================
              STORE
          ================================================= */}

          {mode ===
            "store" &&
            cart &&
            cart.items.length >
              0 && (
              <section
                className={
                  styles.layout
                }
              >
                <div
                  className={
                    styles.items
                  }
                >
                  {cart.items.map(
                    (
                      item
                    ) => (
                      <article
                        key={
                          item.product_id
                        }
                        className={
                          styles.item
                        }
                      >
                        <div
                          className={
                            styles.imageWrap
                          }
                        >
                          <Image
                            src={
                              item.image_url ||
                              "/images/placeholder.png"
                            }
                            alt={
                              item.product_name
                            }
                            fill
                            sizes="105px"
                            className={
                              styles.image
                            }
                          />
                        </div>

                        <div
                          className={
                            styles.itemInfo
                          }
                        >
                          <span
                            className={
                              styles.itemType
                            }
                          >
                            Store Product
                          </span>

                          <h2>
                            {
                              item.product_name
                            }
                          </h2>

                          <p>
                            Quantity:{" "}
                            {
                              item.quantity
                            }
                          </p>

                          <span>
                            GH₵
                            {Number(
                              item.unit_price_ghs
                            ).toLocaleString(
                              "en-GH",
                              {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              }
                            )}{" "}
                            each
                          </span>
                        </div>

                        <strong
                          className={
                            styles.lineTotal
                          }
                        >
                          GH₵
                          {Number(
                            item.line_total_ghs
                          ).toLocaleString(
                            "en-GH",
                            {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            }
                          )}
                        </strong>
                      </article>
                    )
                  )}
                </div>

                <aside
                  className={
                    styles.summary
                  }
                >
                  <div
                    className={
                      styles.summaryHeader
                    }
                  >
                    <h2>
                      Order Summary
                    </h2>

                    <ShieldCheck
                      size={21}
                      color="#ff5100"
                    />
                  </div>

                  <div
                    className={
                      styles.summaryRow
                    }
                  >
                    <span>
                      Items
                    </span>

                    <strong>
                      {
                        cart.item_count
                      }
                    </strong>
                  </div>

                  <div
                    className={
                      styles.summaryRow
                    }
                  >
                    <span>
                      Sub-total
                    </span>

                    <strong>
                      GH₵
                      {formatMoney(
                        storeTotal
                      )}
                    </strong>
                  </div>

                  <div
                    className={
                      styles.divider
                    }
                  />

                  <div
                    className={
                      styles.grandTotal
                    }
                  >
                    <span>
                      Grand Total
                    </span>

                    <strong>
                      GH₵
                      {formatMoney(
                        storeTotal
                      )}
                    </strong>
                  </div>

                  <button
                    type="button"
                    className={
                      styles.paymentButton
                    }
                    onClick={
                      proceedToPayment
                    }
                    disabled={
                      paying
                    }
                  >
                    <CreditCard
                      size={18}
                    />

                    {paying
                      ? "Preparing Payment..."
                      : "Proceed to Payment"}
                  </button>
                </aside>
              </section>
            )}

          {/* =================================================
              EMPTY STORE
          ================================================= */}

          {mode ===
            "store" &&
            (!cart ||
              cart.items.length ===
                0) && (
              <section
                className={
                  styles.empty
                }
              >
                <div
                  className={
                    styles.emptyIcon
                  }
                >
                  <ShoppingBag
                    size={28}
                  />
                </div>

                <h2>
                  Your cart is empty
                </h2>

                <p>
                  Add a product before
                  proceeding to payment.
                </p>

                <Link
                  href="/store"
                  className={
                    styles.storeButton
                  }
                >
                  Browse Store
                </Link>
              </section>
            )}
        </div>
      </main>

      {/* =====================================================
          PAYMENT MODAL
      ===================================================== */}

      {paymentState !==
        "idle" && (
        <div
          className={
            styles.modalOverlay
          }
          role="dialog"
          aria-modal="true"
          aria-label="Payment status"
        >
          <div
            className={
              styles.paymentModal
            }
          >
            {paymentState ===
              "waiting" && (
              <>
                <div
                  className={`${styles.modalIcon} ${styles.modalLoading}`}
                >
                  <Loader2
                    size={34}
                  />
                </div>

                <h2>
                  Waiting for payment
                </h2>

                <p>
                  Paystack has been
                  opened in a new tab.
                </p>

                <p
                  className={
                    styles.modalSecondary
                  }
                >
                  Complete the payment there.
                  This window will update when
                  Paystack confirms it.
                </p>

                <div
                  className={
                    styles.waitingIndicator
                  }
                >
                  <span />

                  Waiting for confirmation...
                </div>

                <button
                  type="button"
                  className={
                    styles.modalSecondaryButton
                  }
                  onClick={() =>
                    setPaymentState(
                      "idle"
                    )
                  }
                >
                  Close
                </button>
              </>
            )}

            {paymentState ===
              "success" && (
              <>
                <div
                  className={`${styles.modalIcon} ${styles.modalSuccess}`}
                >
                  <CheckCircle2
                    size={36}
                  />
                </div>

                <h2>
                  Payment Successful
                </h2>

                <p>
                  Your payment has been
                  successfully verified.
                </p>

                {paymentResult && (
                  <div
                    className={
                      styles.receiptBox
                    }
                  >
                    <span>
                      Reference
                    </span>

                    <strong>
                      {
                        paymentReference
                      }
                    </strong>

                    {paymentResult.receipt
                      ?.receipt_number && (
                      <>
                        <span>
                          Receipt
                        </span>

                        <strong>
                          {
                            paymentResult
                              .receipt
                              .receipt_number
                          }
                        </strong>
                      </>
                    )}

                    {paymentResult.receipt
                      ?.amount_ghs && (
                      <>
                        <span>
                          Amount Paid
                        </span>

                        <strong>
                          GH₵
                          {Number(
                            paymentResult
                              .receipt
                              .amount_ghs
                          ).toLocaleString(
                            "en-GH",
                            {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            }
                          )}
                        </strong>
                      </>
                    )}
                  </div>
                )}

                <div
                  className={
                    styles.modalReceiptActions
                  }
                >
                  {paymentResult?.receipt
                    ?.id && (
                    <Link
                      href={`/receipts/${paymentResult.receipt.id}`}
                      className={
                        styles.modalPrimary
                      }
                    >
                      <ReceiptText
                        size={16}
                      />

                      View Receipt
                    </Link>
                  )}

                  {paymentResult?.receipt && (
                    <button
                      type="button"
                      className={
                        styles.receiptButton
                      }
                      onClick={
                        printReceipt
                      }
                    >
                      <Printer
                        size={16}
                      />

                      Print Receipt
                    </button>
                  )}
                </div>

                <div
                  className={
                    styles.modalActions
                  }
                >
                  {mode ===
                    "booking" && (
                    <Link
                      href="/booking"
                      className={
                        styles.modalPrimary
                      }
                    >
                      View My Bookings
                    </Link>
                  )}

                  {mode ===
                    "rental" && (
                    <Link
                      href="/cart/carts?category=rentals"
                      className={
                        styles.modalPrimary
                      }
                    >
                      View My Rentals
                    </Link>
                  )}

                  {mode ===
                    "store" && (
                    <Link
                      href="/store"
                      className={
                        styles.modalPrimary
                      }
                    >
                      Continue Shopping
                    </Link>
                  )}
                </div>
              </>
            )}

            {paymentState ===
              "error" && (
              <>
                <div
                  className={`${styles.modalIcon} ${styles.modalError}`}
                >
                  <XCircle
                    size={36}
                  />
                </div>

                <h2>
                  Payment could not be started
                </h2>

                <p>
                  {error ||
                    "We could not start the payment."}
                </p>

                <button
                  type="button"
                  className={
                    styles.modalSecondaryButton
                  }
                  onClick={() =>
                    setPaymentState(
                      "idle"
                    )
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