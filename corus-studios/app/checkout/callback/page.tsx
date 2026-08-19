"use client";

import {
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

export default function PaymentCallbackPage() {
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
    const verifyPayment =
      async () => {
        if (!reference) {
          const errorMessage =
            "No payment reference was provided.";

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

          const data =
            (await response
              .json()
              .catch(
                () => null
              )) as
              | VerifyResponse
              | {
                  detail?: unknown;
                  message?: unknown;
                }
              | null;

          if (!response.ok) {
            const backendMessage =
              data &&
              typeof data ===
                "object" &&
              "detail" in data &&
              typeof (
                data as {
                  detail?: unknown;
                }
              ).detail ===
                "string"
                ? (
                    data as {
                      detail: string;
                    }
                  ).detail
                : data &&
                  typeof data ===
                    "object" &&
                  "message" in data &&
                  typeof (
                    data as {
                      message?: unknown;
                    }
                  ).message ===
                    "string"
                ? (
                    data as {
                      message: string;
                    }
                  ).message
                : "Payment verification failed.";

            throw new Error(
              backendMessage
            );
          }

          const verifyData =
            data as VerifyResponse;

          const receiptData =
            getReceipt(
              verifyData
            );

          setReceipt(
            receiptData
          );

          setStatus(
            "success"
          );

          setMessage(
            "Payment successful. Your payment has been verified."
          );

          /*
           * Send the verified result to the
           * checkout tab.
           */
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

          /*
           * Give the parent enough time to receive
           * the message, then close this Paystack
           * callback tab.
           */
          setTimeout(() => {
            window.close();
          }, 1800);
        } catch (error) {
          console.error(
            "PAYMENT VERIFICATION FAILED",
            error
          );

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
            </>
          )}

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
              </div>

              <p
                className={
                  styles.closeNote
                }
              >
                You can return to the checkout
                window.
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
                window.
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