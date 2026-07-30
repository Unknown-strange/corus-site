"use client";

import Image from "next/image";
import { useState } from "react";
import styles from "./SignUp.module.css";
import { useRouter } from "next/navigation";

export default function SignUp() {
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const router = useRouter();

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setNotice(null);

    const form = event.currentTarget;
    const formData = new FormData(form);

    const first_name = formData.get("first_name") as string;
    const last_name = formData.get("last_name") as string;
    const email = formData.get("email") as string;
    const phone_number = formData.get("phone") as string;
    const password = formData.get("password") as string;
    const confirm_password = formData.get("confirm_password") as string;

    // Validate passwords match
    if (password !== confirm_password) {
      setNotice({ type: "error", text: "Passwords do not match." });
      return;
    }

    // Derive username from email (e.g., "john@doe.com" → "john")
    const username = email.split("@")[0];

    // Build the payload
    const payload = {
      first_name,
      last_name,
      username,
      email,
      phone_number,
      password,
    };

    setLoading(true);

    try {
      const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"; // adjust if needed
      const response = await fetch(`${apiBase}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        credentials: "include",
      });

      const data = await response.json();

      if (!response.ok) {
        // Handle validation errors (422)
        let errorMsg = "Registration failed. Please check your input.";
        if (data.detail) {
          if (Array.isArray(data.detail)) {
            errorMsg = data.detail.map((err: any) => err.msg).join(", ");
          } else {
            errorMsg = data.detail;
          }
        }
        throw new Error(errorMsg);
      }

      // Success
      setNotice({
        type: "success",
        text: `Account created for ${email}. Redirecting to verify...`,
      });
      // Redirect after a short delay
      setTimeout(() => {
        router.push(`/verify-otp?email=${encodeURIComponent(email)}&otp=${data.dev_otp}`);
      }, 1500);
    } catch (err: any) {
      setNotice({ type: "error", text: err.message || "Registration failed." });
    }
  }

  return (
    <>
      <div className={styles.header}>
        <Image
          src="/icons/Profile.png"
          alt=""
          width={51}
          height={51}
          className={styles.icon}
        />
        <h1 className={styles.title}>Sign Up</h1>
      </div>

      <p className={styles.subtitle}>Create an account to continue.</p>

      <form className={styles.form} onSubmit={handleSubmit}>
        <div className={styles.nameRow}>
          <input
            className={styles.field}
            type="text"
            name="first_name"
            placeholder="First Name"
            aria-label="First name"
            autoComplete="given-name"
            required
          />
          <input
            className={styles.field}
            type="text"
            name="last_name"
            placeholder="Last Name"
            aria-label="Last name"
            autoComplete="family-name"
            required
          />
        </div>

        <input
          className={`${styles.field} ${styles.fieldLeft}`}
          type="email"
          name="email"
          placeholder="Email"
          aria-label="Email"
          autoComplete="email"
          required
        />

        <div className={styles.phoneRow}>
          <span className={styles.phonePrefix}>+233</span>
          <input
            className={`${styles.field} ${styles.fieldLeft}`}
            type="tel"
            name="phone"
            placeholder="Phone Number"
            aria-label="Phone number"
            autoComplete="tel-national"
            inputMode="numeric"
            required
          />
        </div>

        <input
          className={`${styles.field} ${styles.fieldLeft}`}
          type="password"
          name="password"
          placeholder="Password"
          aria-label="Password"
          autoComplete="new-password"
          minLength={8}
          required
        />

        <input
          className={`${styles.field} ${styles.fieldLeft}`}
          type="password"
          name="confirm_password"
          placeholder="Confirm Password"
          aria-label="Confirm password"
          autoComplete="new-password"
          minLength={8}
          required
        />

        <button className={styles.submit} type="submit" disabled={loading}>
          {loading ? "Signing up..." : "Sign Up"}
        </button>
      </form>

      {notice && (
        <p
          className={`${styles.notice} ${
            notice.type === "error" ? styles.errorNotice : styles.successNotice
          }`}
          role="status"
        >
          {notice.text}
        </p>
      )}
    </>
  );
}