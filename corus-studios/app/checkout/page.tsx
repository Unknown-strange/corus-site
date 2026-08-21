"use client";

import {
  useEffect,
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
};

type CheckoutResponse = {
  authorization_url?: string;
  reference?: string;
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
          .map((item) => {
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
          })
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

function formatDate(
  value: string
): string {
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
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    }
  );
}

function formatMoney(
  value: number
): string {
  return value.toLocaleString(
    "en-GH",
    {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }
  );
}

/* =========================================================
   CHECKOUT PAGE
========================================================= */

export default function CheckoutPage() {
  const [mode, setMode] =
    useState<CheckoutMode>(
      "store"
    );

  const [cart, setCart] =
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

  const [loading, setLoading] =
    useState(true);

  const [paying, setPaying] =
    useState(false);

  const [error, setError] =
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
     LOAD CHECKOUT CONTEXT
  ========================================================= */

  useEffect(() => {
    const loadCheckout =
      async () => {
        /* =========================================
           BOOKING
        ========================================= */

        try {
          const bookingRaw =
            sessionStorage.getItem(
              "booking_checkout"
            );

          if (
            bookingRaw
          ) {
            const booking =
              JSON.parse(
                bookingRaw
              ) as BookingCheckoutData;

            if (
              booking.hold_id
            ) {
              setBookingCheckout(
                booking
              );

              setMode(
                "booking"
              );

              setLoading(
                false
              );

              return;
            }
          }
        } catch {
          sessionStorage.removeItem(
            "booking_checkout"
          );
        }

        /* =========================================
           RENTAL
        ========================================= */

        try {
          const rentalRaw =
            sessionStorage.getItem(
              "rental_checkout"
            );

          if (
            rentalRaw
          ) {
            const rental =
              JSON.parse(
                rentalRaw
              ) as RentalCheckoutData;

            if (
              rental.equipment_id
            ) {
              setRentalCheckout(
                rental
              );

              setMode(
                "rental"
              );

              setLoading(
                false
              );

              return;
            }
          }
        } catch {
          sessionStorage.removeItem(
            "rental_checkout"
          );
        }

        /* =========================================
           STORE
        ========================================= */

        const token =
          localStorage.getItem(
            "access_token"
          );

        if (!token) {
          setError(
            "Please log in to continue."
          );

          setLoading(
            false
          );

          return;
        }

        try {
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

          setCart(
            data as CartResponse
          );

          setMode(
            "store"
          );
        } catch (err) {
          setError(
            err instanceof Error
              ? err.message
              : "Unable to load your cart."
          );
        } finally {
          setLoading(
            false
          );
        }
      };

    loadCheckout();
  }, []);

  /* =========================================================
     PAYMENT RESULT LISTENER
  ========================================================= */

  useEffect(() => {
    const applyPaymentResult =
      (value: unknown) => {
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
            "booking_checkout"
          );

          sessionStorage.removeItem(
            "rental_checkout"
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

    /* =========================================
       postMessage
    ========================================= */

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

        const result =
          event.data?.result;

        applyPaymentResult({
          ...(result &&
          typeof result ===
            "object"
            ? result
            : {}),

          status:
            event.data.status,
        });
      };

    /* =========================================
       STORAGE
    ========================================= */

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
          // Ignore malformed data.
        }
      };

    /* =========================================
       READ EXISTING RESULT
    ========================================= */

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
     PRINT RECEIPT
  ========================================================= */

  const printReceipt =
    () => {
      if (
        !paymentResult
      ) {
        return;
      }

      const receipt =
        paymentResult.receipt;

      const reference =
        paymentResult.reference ||
        paymentReference ||
        "";

      const amount =
        receipt?.amount_ghs
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

      const issued =
        receipt?.issued_at
          ? new Date(
              receipt.issued_at
            ).toLocaleString(
              "en-GH"
            )
          : "";

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

      printWindow.document.write(`
        <!doctype html>

        <html>
          <head>
            <title>
              Corus Studios Receipt
            </title>

            <style>
              body {
                font-family:
                  Arial,
                  Helvetica,
                  sans-serif;

                margin: 0;

                padding: 40px;

                color: #111827;

                background: #ffffff;
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

                text-transform:
                  uppercase;
              }

              h1 {
                margin:
                  8px 0 4px;

                font-size: 30px;
              }

              .sub {
                color: #667085;

                margin-bottom: 30px;
              }

              .line {
                border-top:
                  1px solid
                  #e5e7eb;

                margin: 20px 0;
              }

              .row {
                display: flex;

                justify-content:
                  space-between;

                gap: 20px;

                padding: 10px 0;
              }

              .label {
                color: #667085;
              }

              .value {
                font-weight: 700;

                text-align:
                  right;

                word-break:
                  break-word;
              }

              .total {
                font-size: 20px;
              }

              .footer {
                margin-top: 35px;

                color: #98a2b3;

                font-size: 12px;

                text-align:
                  center;
              }

              @media print {
                body {
                  padding: 20px;
                }
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

              <div class="sub">
                Thank you for your payment.
              </div>

              <div class="line"></div>

              <div class="row">
                <span class="label">
                  Reference
                </span>

                <span class="value">
                  ${reference || "N/A"}
                </span>
              </div>

              ${
                receipt?.receipt_number
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

              ${
                issued
                  ? `
                    <div class="row">
                      <span class="label">
                        Issued
                      </span>

                      <span class="value">
                        ${issued}
                      </span>
                    </div>
                  `
                  : ""
              }

              <div class="line"></div>

              <div class="footer">
                Corus Studios
              </div>
            </div>
          </body>
        </html>
      `);

      printWindow.document.close();

      printWindow.focus();

      printWindow.print();
    };

  /* =========================================================
     PROCEED TO PAYMENT
  ========================================================= */

  const proceedToPayment =
    async () => {
      const token =
        localStorage.getItem(
          "access_token"
        );

      if (!token) {
        setError(
          "Please log in to continue."
        );

        return;
      }

      try {
        /* -----------------------------------------
           CLEAR PREVIOUS PAYMENT RESULT
        ----------------------------------------- */

        try {
          localStorage.removeItem(
            PAYMENT_STORAGE_KEY
          );
        } catch {
          // Ignore.
        }

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

        console.log(
          "STARTING PAYMENT",
          {
            mode,
            apiBase:
              process.env
                .NEXT_PUBLIC_API_URL,
          }
        );

        /* =========================================
           BOOKING
        ========================================= */

        if (
          mode ===
            "booking" &&
          bookingCheckout
        ) {
          response =
            await api.sessions.checkoutBooking(
              {
                hold_id:
                  bookingCheckout.hold_id,
              },
              token
            );
        }

        /* =========================================
           RENTAL
        ========================================= */

        else if (
          mode ===
            "rental" &&
          rentalCheckout
        ) {
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

        /* =========================================
           STORE
        ========================================= */

        else {
          if (
            !cart ||
            cart.items.length ===
              0
          ) {
            setError(
              "Your cart is empty."
            );

            setPaying(
              false
            );

            return;
          }

          response =
            await api.orders.checkout(
              token
            );
        }

        console.log(
          "CHECKOUT HTTP RESPONSE",
          {
            status:
              response.status,
            ok:
              response.ok,
            url:
              response.url,
          }
        );

        const rawBody =
          await response.text();

        const data =
          parseResponseBody(
            rawBody
          );

        console.log(
          "CHECKOUT RESPONSE",
          data
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
          throw new Error(
            getErrorMessage(
              data,
              `Checkout failed (${response.status}).`
            )
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
            "The backend completed checkout but did not return a Paystack authorization URL."
          );
        }

        if (
          checkout.reference
        ) {
          setPaymentReference(
            checkout.reference
          );
        }

        /* =========================================
           SHOW WAITING MODAL
        ========================================= */

        setPaymentState(
          "waiting"
        );

        /* =========================================
           OPEN PAYSTACK
        ========================================= */

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
      } catch (err) {
        console.error(
          "PAYMENT START FAILED",
          err
        );

        setPaymentState(
          "error"
        );

        setError(
          err instanceof Error
            ? err.message
            : "Unable to start payment."
        );

        setPaying(
          false
        );
      }
    };

  /* =========================================================
     LOADING
  ========================================================= */

  if (loading) {
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
     TOTALS
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

  const heading =
    mode === "booking"
      ? "Review your booking"
      : mode === "rental"
      ? "Review your rental"
      : "Complete your order";

  const subtitle =
    mode === "booking"
      ? "Confirm your session details before continuing to payment."
      : mode === "rental"
      ? "Confirm your rental details before continuing to payment."
      : "Review your products before continuing to secure payment.";

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
                ? "/"
                : mode ===
                  "rental"
                ? "/rentals"
                : "/cart"
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
              {error}
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
                        Photography
                        Session
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
                          -{" "}
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
                      Date
                    </span>

                    <strong>
                      {formatDate(
                        bookingCheckout.slot_starts_at
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
                      Total
                    </span>

                    <strong>
                      GH₵
                      {formatMoney(
                        bookingPrice
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

                    Proceed to Payment
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
                          rentalCheckout.image_url
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
                          -{" "}
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
                      {rentalDays}
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

                    Proceed to Payment
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

                    Proceed to Payment
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
            {/* ===============================================
                WAITING
            =============================================== */}

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
                  Paystack has been opened
                  in a new tab.
                </p>

                <p
                  className={
                    styles.modalSecondary
                  }
                >
                  Complete your payment there.
                  We'll automatically update
                  this window when Paystack
                  confirms it.
                </p>

                <div
                  className={
                    styles.waitingIndicator
                  }
                >
                  <span />

                  Waiting for confirmation...
                </div>
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

                <div
                  className={
                    styles.receiptBox
                  }
                >
                  <span>
                    Reference
                  </span>

                  <strong>
                    {paymentReference ||
                      "Unavailable"}
                  </strong>

                  {paymentResult
                    ?.receipt
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

                  {paymentResult
                    ?.receipt
                    ?.amount_ghs && (
                    <>
                      <span>
                        Amount
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

                  {paymentResult
                    ?.receipt
                    ?.issued_at && (
                    <>
                      <span>
                        Issued
                      </span>

                      <strong>
                        {new Date(
                          paymentResult
                            .receipt
                            .issued_at
                        ).toLocaleString(
                          "en-GH"
                        )}
                      </strong>
                    </>
                  )}
                </div>

                <div
                  className={
                    styles.modalReceiptActions
                  }
                >
                  {paymentResult
                    ?.receipt?.id && (
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

                  {paymentResult
                    ?.receipt && (
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

                <p
                  className={
                    styles.modalSecondary
                  }
                >
                  Your payment has been
                  verified successfully.
                </p>

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
                      href="/rentals"
                      className={
                        styles.modalPrimary
                      }
                    >
                      Back to Rentals
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

            {/* ===============================================
                ERROR
            =============================================== */}

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
                  Payment Verification Failed
                </h2>

                <p>
                  We couldn't confirm the
                  payment.
                </p>

                {error && (
                  <p
                    className={
                      styles.modalErrorText
                    }
                  >
                    {error}
                  </p>
                )}

                {paymentReference && (
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
                  </div>
                )}

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