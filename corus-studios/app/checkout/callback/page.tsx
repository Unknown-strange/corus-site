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

const PAYMENT_STORAGE_KEY =
  "corus_payment_result";

const CHECKOUT_CONTEXT_KEYS = [
  "corus_checkout_intent",
  "booking_checkout",
  "rental_checkout",
  "store_checkout_selection",
];

type PaymentStatus =
  | "loading"
  | "success"
  | "error";

type ReceiptSummary = {
  id: string;
  receipt_number: string;
  receipt_type: string;
  amount_ghs: string;
  issued_at: string;
};

type VerifyResponse = {
  status?: string;
  reference?: string;
  callback_path?: string;

  booking_id?: string | null;
  rental_id?: string | null;
  reservation_id?: string | null;
  order_id?: string | null;

  message?: string;

  amount_ghs?: string;
  receipt_number?: string;
  issued_at?: string;

  receipt?: {
    receipt_number?: string;
    amount_ghs?: string;
    issued_at?: string;
  } | null;
};

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
    const value =
      data as {
        detail?: unknown;
        message?: unknown;
        error?: {
          message?: unknown;
        };
      };

    if (
      typeof value.detail ===
      "string"
    ) {
      return value.detail;
    }

    if (
      Array.isArray(
        value.detail
      )
    ) {
      const messages =
        value.detail
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

/* =========================================================
   SAVE RESULT FOR CHECKOUT
========================================================= */

function savePaymentResult(
  status:
    | "success"
    | "error",
  result: {
    reference?: string;
    message?: string;
    receipt?: ReceiptSummary | null;
    verify?: VerifyResponse | null;
  }
) {
  try {
    localStorage.setItem(
      PAYMENT_STORAGE_KEY,
      JSON.stringify({
        status,
        ...result,
        saved_at:
          Date.now(),
      })
    );
  } catch {
    // Ignore storage errors.
  }
}

function clearCheckoutContextInThisTab() {
  for (
    const key of CHECKOUT_CONTEXT_KEYS
  ) {
    try {
      sessionStorage.removeItem(
        key
      );
    } catch {
      // Ignore storage errors.
    }
  }
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
    useState<ReceiptSummary | null>(
      null
    );

  const [
    verification,
    setVerification,
  ] =
    useState<VerifyResponse | null>(
      null
    );

  useEffect(() => {
    let cancelled = false;

    const verifyPayment =
      async () => {
        /* =========================================
           REFERENCE
        ========================================= */

        if (!reference) {
          const errorMessage =
            "No payment reference was provided.";

          setStatus(
            "error"
          );

          setMessage(
            errorMessage
          );

          savePaymentResult(
            "error",
            {
              message:
                errorMessage,
            }
          );

          return;
        }

        /* =========================================
           AUTH
        ========================================= */

        const token =
          localStorage.getItem(
            "access_token"
          );

        if (!token) {
          const errorMessage =
            "Your session has expired. Please log in again.";

          setStatus(
            "error"
          );

          setMessage(
            errorMessage
          );

          savePaymentResult(
            "error",
            {
              reference,
              message:
                errorMessage,
            }
          );

          return;
        }

        try {
          /* =========================================
             STEP 1 — VERIFY PAYMENT

             GET /payments/verify/{reference}
          ========================================= */

          const verifyResponse =
            await fetch(
              `${API_BASE}/payments/verify/${encodeURIComponent(
                reference
              )}`,
              {
                method: "GET",

                headers: {
                  Authorization:
                    `Bearer ${token}`,
                },
              }
            );

          const verifyRaw =
            await verifyResponse.text();

          let verifyBody:
            unknown = null;

          if (
            verifyRaw
          ) {
            try {
              verifyBody =
                JSON.parse(
                  verifyRaw
                );
            } catch {
              verifyBody =
                verifyRaw;
            }
          }

          console.log(
            "PAYMENT VERIFY RESPONSE",
            {
              status:
                verifyResponse.status,
              ok:
                verifyResponse.ok,
              body:
                verifyBody,
              reference,
            }
          );

          if (
            !verifyResponse.ok
          ) {
            throw new Error(
              getErrorMessage(
                verifyBody,
                `Payment verification failed (${verifyResponse.status}).`
              )
            );
          }

          const verificationData =
            verifyBody as VerifyResponse;

          if (
            cancelled
          ) {
            return;
          }

          setVerification(
            verificationData
          );

          /* =========================================
             STEP 2 — GET MY RECEIPTS
             
             GET /receipts/me
          ========================================= */

          let matchingReceipt:
            | ReceiptSummary
            | null = null;

          try {
            const receiptsResponse =
              await fetch(
                `${API_BASE}/receipts/me`,
                {
                  method: "GET",

                  headers: {
                    Authorization:
                      `Bearer ${token}`,
                  },
                }
              );

            const receiptsRaw =
              await receiptsResponse.text();

            let receiptsBody:
              unknown = null;

            if (
              receiptsRaw
            ) {
              try {
                receiptsBody =
                  JSON.parse(
                    receiptsRaw
                  );
              } catch {
                receiptsBody =
                  null;
              }
            }

            console.log(
              "MY RECEIPTS RESPONSE",
              {
                status:
                  receiptsResponse.status,
                ok:
                  receiptsResponse.ok,
                body:
                  receiptsBody,
              }
            );

            if (
              receiptsResponse.ok &&
              Array.isArray(
                receiptsBody
              )
            ) {
              const receipts =
                receiptsBody as ReceiptSummary[];

              /* -----------------------------------------
                 Best match: receipt number
              ----------------------------------------- */

              if (
                verificationData.receipt_number
              ) {
                matchingReceipt =
                  receipts.find(
                    (
                      item
                    ) =>
                      item.receipt_number ===
                      verificationData.receipt_number
                  ) ||
                  null;
              }

              /* -----------------------------------------
                 Fallback: receipt amount
              ----------------------------------------- */

              if (
                !matchingReceipt &&
                verificationData.amount_ghs
              ) {
                matchingReceipt =
                  receipts.find(
                    (
                      item
                    ) =>
                      Number(
                        item.amount_ghs
                      ) ===
                      Number(
                        verificationData.amount_ghs
                      )
                  ) ||
                  null;
              }

              /* -----------------------------------------
                 Final fallback: most recent receipt
                 AFTER successful verification
              ----------------------------------------- */

              if (
                !matchingReceipt &&
                receipts.length > 0
              ) {
                matchingReceipt =
                  [...receipts].sort(
                    (a, b) =>
                      new Date(
                        b.issued_at
                      ).getTime() -
                      new Date(
                        a.issued_at
                      ).getTime()
                  )[0];
              }
            }
          } catch (
            receiptError
          ) {
            console.warn(
              "RECEIPT LOOKUP FAILED",
              receiptError
            );

            /*
             * Receipt lookup failing should not turn
             * an already verified payment into failure.
             */
          }

          /* =========================================
             SUCCESS
          ========================================= */

          setReceipt(
            matchingReceipt
          );

          setStatus(
            "success"
          );

          setMessage(
            verificationData.message ||
              "Payment successful. Your payment has been verified."
          );

          savePaymentResult(
            "success",
            {
              reference,

              message:
                verificationData.message ||
                "Payment successful.",

              receipt:
                matchingReceipt,

              verify:
                verificationData,
            }
          );

          clearCheckoutContextInThisTab();

          /* =========================================
             postMessage BACKUP
          ========================================= */

          try {
            window.opener?.postMessage(
              {
                type:
                  "CORUS_PAYMENT_RESULT",

                status:
                  "success",

                result: {
                  reference,

                  message:
                    verificationData.message ||
                    "Payment successful.",

                  receipt:
                    matchingReceipt,

                  verify:
                    verificationData,
                },
              },
              window.location.origin
            );
          } catch {
            // localStorage remains the main mechanism.
          }

          /* =========================================
             CLOSE CALLBACK WINDOW
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

          savePaymentResult(
            "error",
            {
              reference,
              message:
                errorMessage,
            }
          );

          clearCheckoutContextInThisTab();

          try {
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
          } catch {
            // Ignore.
          }
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
                  {reference}
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

                {(
                  receipt?.amount_ghs ||
                  verification?.amount_ghs
                ) && (
                  <>
                    <span>
                      Amount
                    </span>

                    <strong>
                      GH₵
                      {Number(
                        receipt?.amount_ghs ||
                          verification?.amount_ghs ||
                          0
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

                {(
                  receipt?.issued_at ||
                  verification?.issued_at
                ) && (
                  <>
                    <span>
                      Issued
                    </span>

                    <strong>
                      {new Date(
                        receipt?.issued_at ||
                          verification?.issued_at ||
                          ""
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
                Payment confirmed. Returning
                you to checkout...
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
   SUSPENSE FALLBACK
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