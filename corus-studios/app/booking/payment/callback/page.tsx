"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";

import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

import styles from "./page.module.css";

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:8000";

export default function PaymentCallbackPage() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const reference =
    searchParams.get("reference");

  const [status, setStatus] = useState<
    "loading" | "success" | "error"
  >("loading");

  const [message, setMessage] =
    useState(
      "Verifying your payment..."
    );

  useEffect(() => {
    const verifyPayment = async () => {
      if (!reference) {
        setStatus("error");
        setMessage(
          "No payment reference was provided."
        );
        return;
      }

      const token =
        localStorage.getItem(
          "access_token"
        );

      if (!token) {
        setStatus("error");
        setMessage(
          "Your session has expired. Please log in again."
        );
        return;
      }

      try {
        const response =
          await fetch(
            `${API_BASE}/payments/verify`,
            {
              method: "POST",
              headers: {
                "Content-Type":
                  "application/json",
                Authorization:
                  `Bearer ${token}`,
              },
              body: JSON.stringify({
                reference,
              }),
            }
          );

        const data =
          await response
            .json()
            .catch(() => null);

        if (!response.ok) {
          throw new Error(
            data?.detail ||
              data?.message ||
              "Payment verification failed."
          );
        }

        setStatus("success");
        setMessage(
          "Payment successful. Your booking has been submitted."
        );

        /*
         * Give the backend a moment to finish
         * processing, then take the user to
         * their booking/request page.
         */
        setTimeout(() => {
          router.push(
            "/booking"
          );
        }, 2500);
      } catch (error) {
        console.error(
          "Payment verification failed:",
          error
        );

        setStatus("error");
        setMessage(
          error instanceof Error
            ? error.message
            : "We could not verify your payment."
        );
      }
    };

    verifyPayment();
  }, [reference, router]);

  return (
    <>
      <Navbar />

      <main className={styles.page}>
        <div className={styles.card}>
          {status === "loading" && (
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

          {status === "success" && (
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

              <p
                className={
                  styles.reference
                }
              >
                Reference:
                <strong>
                  {reference}
                </strong>
              </p>
            </>
          )}

          {status === "error" && (
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
                <p
                  className={
                    styles.reference
                  }
                >
                  Reference:
                  <strong>
                    {reference}
                  </strong>
                </p>
              )}

              <button
                type="button"
                className={
                  styles.button
                }
                onClick={() =>
                  router.push(
                    "/"
                  )
                }
              >
                Return Home
              </button>
            </>
          )}
        </div>
      </main>

      <Footer />
    </>
  );
}