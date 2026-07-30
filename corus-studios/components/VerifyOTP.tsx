"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import styles from "./VerifyOTP.module.css";

export default function VerifyOTP() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get("email") || "";
  const otpFromUrl = searchParams.get("otp") || "";

  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [devOtp, setDevOtp] = useState<string | null>(null);

  // Redirect to sign-up if no email
  useEffect(() => {
    if (!email) {
      router.push("/signup");
    }
  }, [email, router]);

  // Auto-fill OTP from URL query param
  useEffect(() => {
    if (otpFromUrl) {
      setOtp(otpFromUrl);
      setMessage({ type: "success", text: "OTP pre-filled from your registration." });
    }
  }, [otpFromUrl]);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp) {
      setMessage({ type: "error", text: "Please enter the OTP." });
      return;
    }
    setLoading(true);
    setMessage(null);

    try {
      const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      const response = await fetch(`${apiBase}/auth/verify-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp }),
      });

      const data = await response.json();

      if (!response.ok) {
        let errorMsg = "Verification failed.";
        if (data.detail) {
          if (Array.isArray(data.detail)) {
            errorMsg = data.detail.map((err: any) => err.msg).join(", ");
          } else {
            errorMsg = data.detail;
          }
        }
        throw new Error(errorMsg);
      }

      localStorage.setItem("access_token", data.access_token);
      setMessage({ type: "success", text: "Verification successful! Redirecting..." });
      setTimeout(() => {
        router.push("/Login/page.tsx");
      }, 1500);
    } catch (err: any) {
      setMessage({ type: "error", text: err.message || "Verification failed." });
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (!email) return;
    setResendLoading(true);
    setMessage(null);
    setDevOtp(null);

    try {
      const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      const response = await fetch(`${apiBase}/auth/resend-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (!response.ok) {
        let errorMsg = "Failed to resend OTP.";
        if (data.detail) {
          if (Array.isArray(data.detail)) {
            errorMsg = data.detail.map((err: any) => err.msg).join(", ");
          } else {
            errorMsg = data.detail;
          }
        }
        throw new Error(errorMsg);
      }

      setMessage({ type: "success", text: "New OTP sent to your email." });
      if (data.dev_otp) {
        setDevOtp(data.dev_otp);
        // Optionally auto-fill with new OTP
        setOtp(data.dev_otp);
      }
    } catch (err: any) {
      setMessage({ type: "error", text: err.message || "Failed to resend OTP." });
    } finally {
      setResendLoading(false);
    }
  };

  if (!email) return null;

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <h1 className={styles.title}>Verify Your Email</h1>
        <p className={styles.subtitle}>
          We sent a verification code to <strong>{email}</strong>. Please enter it below.
        </p>

        <form className={styles.form} onSubmit={handleVerify}>
          <input
            className={styles.input}
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={6}
            placeholder="Enter 6-digit OTP"
            value={otp}
            onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
            required
          />

          <button className={styles.verifyButton} type="submit" disabled={loading}>
            {loading ? "Verifying..." : "Verify OTP"}
          </button>
        </form>

        <div className={styles.resendSection}>
          <button
            className={styles.resendButton}
            onClick={handleResend}
            disabled={resendLoading}
          >
            {resendLoading ? "Sending..." : "Resend OTP"}
          </button>
        </div>

        {message && (
          <p
            className={`${styles.message} ${
              message.type === "success" ? styles.success : styles.error
            }`}
            role="alert"
          >
            {message.text}
          </p>
        )}

        {devOtp && process.env.NODE_ENV === "development" && (
          <p className={styles.devOtp}>
            🔑 Dev OTP: <strong>{devOtp}</strong> (copy and paste)
          </p>
        )}
      </div>
    </div>
  );
}