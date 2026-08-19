"use client";

import {
  Suspense,
  useEffect,
  useState,
} from "react";

import { useSearchParams } from "next/navigation";

import {
  CheckCircle2,
  XCircle,
  Loader2,
} from "lucide-react";

import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

import styles from "./page.module.css";

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:8000";

type PaymentStatus =
  | "loading"
  | "success"
  | "error";

type ReceiptInfo = {
  receipt_number?: string;
  amount_ghs?: string;
  issued_at?: string;
};

type VerifyResponse = {
  reference?: string;
  status?: string;
  message?: string;

  receipt?: ReceiptInfo | null;

  receipt_number?: string;
  amount_ghs?: string;
  issued_at?: string;
};

/* =========================================================
   RECEIPT HELPERS
========================================================= */

function getReceipt(
  data: VerifyResponse
): ReceiptInfo | null {
  if (
    data.receipt &&
    typeof data.receipt ===
      "object"
  ) {
    return data.receipt;
  }

  if (
    data.receipt_number ||
    data.amount_ghs ||
    data.issued_at
  ) {
    return {
      receipt_number:
        data.receipt_number,
      amount_ghs:
        data.amount_ghs,
      issued_at:
        data.issued_at,
    };
  }

  return null;
}

/* =========================================================
   ERROR MESSAGE
========================================================= */

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
    if (
      "detail" in data
    ) {
      const detail =
        (
          data as {
            detail?: unknown;
          }
        ).detail;

      if (
        typeof detail ===
        "string"
      ) {
        return detail;
      }

      if (
        Array.isArray(detail)
      ) {
        const messages =
          detail
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
          messages.length >
          0
        ) {
          return messages.join(
            ", "
          );
        }
      }
    }

    if (
      "message" in data &&
      typeof (
        data as {
          message?: unknown;
        }
      ).message === "string"
    ) {
      return (
        data as {
          message: string;
        }
      ).message;
    }

    if (
      "error" in data
    ) {
      const errorValue =
        (
          data as {
            error?: unknown;
          }
        ).error;

      if (
        errorValue &&
        typeof errorValue ===
          "object" &&
        "message" in
          errorValue &&
        typeof (
          errorValue as {
            message?: unknown;
          }
        ).message ===
          "string"
      ) {
        return (
          errorValue as {
            message: string;
          }
        ).message;
      }
    }
  }

  return fallback;
}

/* =========================================================
   CALLBACK CONTENT
========================================================= */

function PaymentCallbackContent() {
  const searchParams =
    useSearchParams();

  const reference =
    searchParams.get(
      "reference"
    ) ||
    searchParams.get(
      "trxref"
    );

  const [
    status,
    setStatus,
  ] =
    useState<PaymentStatus>(
      "loading"
    );

  const [
    message,
    setMessage,
  ] =
    useState(
      "Verifying your payment..."
    );

  const [
    receipt,
    setReceipt,
  ] =
    useState<ReceiptInfo | null>(
      null
    );

  useEffect(() => {
    let cancelled = false;

    const verifyPayment =
      async () => {
        /* =========================================
           NO REFERENCE
        ========================================= */

        if (!reference) {
          const errorMessage =
            "No payment reference was provided.";

          if (
            cancelled
          ) {
            return;
          }

          setStatus(
            "error"
          );

          setMessage(
            errorMessage
          );

          window.opener?.postMessage(
            {
              type:
                "CORUS_PAYMENT_RESULT",
              status:
                "error",
              result: {
                message:
                  errorMessage,
              },
            },
            window.location.origin
          );

          return;
        }

        /* =========================================
           AUTH TOKEN
        ========================================= */

        const token =
          localStorage.getItem(
            "access_token"
          );

        if (!token) {
          const errorMessage =
            "Your session has expired. Please log in again.";

          if (
            cancelled
          ) {
            return;
          }

          setStatus(
            "error"
          );

          setMessage(
            errorMessage
          );

          window.opener?.postMessage(
            {
              type:
                "CORUS_PAYMENT_RESULT",
              status:
                "error",
              result: {
                reference,
                message:
                  errorMessage,
              },
            },
            window.location.origin
          );

          return;
        }

        /* =========================================
           VERIFY PAYMENT
        ========================================= */

        try {
          const response =
            await fetch(
              `${API_BASE}/payments/verify`,
              {
                method:
                  "POST",

                headers: {
                  "Content-Type":
                    "application/json",

                  Authorization:
                    `Bearer ${token}`,
                },

                body:
                  JSON.stringify({
                    reference,
                  }),
              }
            );

          const rawBody =
            await response.text();

          let data: unknown =
            null;

          if (rawBody) {
            try {
              data =
                JSON.parse(
                  rawBody
                );
            } catch {
              data =
                rawBody;
            }
          }

          console.log(
            "PAYMENT VERIFICATION RESPONSE",
            {
              status:
                response.status,
              ok:
                response.ok,
              body:
                data,
              reference,
            }
          );

          if (
            !response.ok
          ) {
            throw new Error(
              getErrorMessage(
                data,
                "Payment verification failed."
              )
            );
          }

          const verifyData =
            data as VerifyResponse;

          const receiptData =
            getReceipt(
              verifyData
            );

          if (
            cancelled
          ) {
            return;
          }

          setReceipt(
            receiptData
          );

          setStatus(
            "success"
          );

          setMessage(
            verifyData.message ||
              "Payment successful. Your payment has been verified."
          );

          /* =========================================
             SEND RESULT TO CHECKOUT WINDOW
          ========================================= */

          window.opener?.postMessage(
            {
              type:
                "CORUS_PAYMENT_RESULT",

              status:
                "success",

              result: {
                reference,

                message:
                  verifyData.message,

                receipt:
                  receiptData,

                receipt_number:
                  verifyData.receipt_number,

                amount_ghs:
                  verifyData.amount_ghs,

                issued_at:
                  verifyData.issued_at,
              },
            },

            window.location.origin
          );

          /* =========================================
             CLOSE CALLBACK TAB
          ========================================= */

          setTimeout(() => {
            try {
              window.close();
            } catch {
              // Browser may prevent closing.
            }
          }, 1800);
        } catch (error) {
          console.error(
            "PAYMENT VERIFICATION FAILED",
            error
          );

          if (
            cancelled
          ) {
            return;
          }

          const errorMessage =
            error instanceof Error
              ? error.message
              : "We could not verify your payment.";

          setStatus(
            "error"
          );

          setMessage(
            errorMessage
          );

          window.opener?.postMessage(
            {
              type:
                "CORUS_PAYMENT_RESULT",

              status:
                "error",

              result: {
                reference,
                message:
                  errorMessage,
              },
            },

            window.location.origin
          );
        }
      };

    verifyPayment();

    return () => {
      cancelled = true;
    };
  }, [reference]);

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
            styles.card
          }
        >
          {/* =========================================
              LOADING
          ========================================= */}

          {status ===
            "loading" && (
            <>
              <div
                className={`${styles.icon} ${styles.loading}`}
              >
                <Loader2
                  size={42}
                />
              </div>

              <h1>
                Verifying Payment
              </h1>

              <p>
                Please wait while we
                confirm your Paystack
                payment.
              </p>

              {reference && (
                <div
                  className={
                    styles.reference
                  }
                >
                  <span>
                    Reference
                  </span>

                  <strong>
                    {reference}
                  </strong>
                </div>
              )}
            </>
          )}

          {/* =========================================
              SUCCESS
          ========================================= */}

          {status ===
            "success" && (
            <>
              <div
                className={`${styles.icon} ${styles.success}`}
              >
                <CheckCircle2
                  size={42}
                />
              </div>

              <h1>
                Payment Successful
              </h1>

              <p>
                {message}
              </p>

              <div
                className={
                  styles.reference
                }
              >
                <span>
                  Reference
                </span>

                <strong>
                  {
                    reference
                  }
                </strong>

                {receipt?.receipt_number && (
                  <>
                    <span>
                      Receipt
                    </span>

                    <strong>
                      {
                        receipt.receipt_number
                      }
                    </strong>
                  </>
                )}

                {receipt?.amount_ghs && (
                  <>
                    <span>
                      Amount
                    </span>

                    <strong>
                      GH₵
                      {Number(
                        receipt.amount_ghs
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

                {receipt?.issued_at && (
                  <>
                    <span>
                      Issued
                    </span>

                    <strong>
                      {new Date(
                        receipt.issued_at
                      ).toLocaleString(
                        "en-GH"
                      )}
                    </strong>
                  </>
                )}
              </div>

              <p
                className={
                  styles.closeNote
                }
              >
                Payment confirmation has been
                sent back to the checkout window.
              </p>

              <button
                type="button"
                className={
                  styles.button
                }
                onClick={() =>
                  window.close()
                }
              >
                Close Window
              </button>
            </>
          )}

          {/* =========================================
              ERROR
          ========================================= */}

          {status ===
            "error" && (
            <>
              <div
                className={`${styles.icon} ${styles.error}`}
              >
                <XCircle
                  size={42}
                />
              </div>

              <h1>
                Payment Verification Failed
              </h1>

              <p>
                {message}
              </p>

              {reference && (
                <div
                  className={
                    styles.reference
                  }
                >
                  <span>
                    Reference
                  </span>

                  <strong>
                    {reference}
                  </strong>
                </div>
              )}

              <p
                className={
                  styles.closeNote
                }
              >
                Please return to the checkout
                window and try again if necessary.
              </p>

              <button
                type="button"
                className={
                  styles.button
                }
                onClick={() =>
                  window.close()
                }
              >
                Close Window
              </button>
            </>
          )}
        </div>
      </main>

      <Footer />
    </>
  );
}

/* =========================================================
   PAGE WRAPPER WITH SUSPENSE
========================================================= */

function CallbackLoading() {
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
            styles.card
          }
        >
          <div
            className={`${styles.icon} ${styles.loading}`}
          >
            <Loader2
              size={42}
            />
          </div>

          <h1>
            Loading Payment
          </h1>

          <p>
            Preparing payment verification...
          </p>
        </div>
      </main>

      <Footer />
    </>
  );
}

export default function PaymentCallbackPage() {
  return (
    <Suspense
      fallback={
        <CallbackLoading />
      }
    >
      <PaymentCallbackContent />
    </Suspense>
  );
}