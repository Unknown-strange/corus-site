"use client";

import Image from "next/image";
import { useState } from "react";
import { User, Mail, Lock, Eye, EyeOff, Phone } from "lucide-react";
import styles from "./SignUp.module.css";
import { useRouter } from "next/navigation";

export default function SignUp() {
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const router = useRouter();
  // Toggle states for password and confirm password
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setNotice(null);

    const form = event.currentTarget;
    const formData = new FormData(form);

    const first_name = formData.get("first_name") as string;
    const last_name = formData.get("last_name") as string;
    const username = formData.get("username") as string; // ← added
    const email = formData.get("email") as string;
    const phone_number = formData.get("phone") as string;
    const password = formData.get("password") as string;
    const confirm_password = formData.get("confirm_password") as string;

    // Validate passwords match
    if (password !== confirm_password) {
      setNotice({ type: "error", text: "Passwords do not match." });
      return;
    }

    // Build the payload – now using the user-provided username
    const payload = {
      first_name,
      last_name,
      username,      // ← use the field directly
      email,
      phone_number,
      password,
    };

    setLoading(true);

    try {
      const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      const response = await fetch(`${apiBase}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        credentials: "include",
      });

      const data = await response.json();

      if (!response.ok) {
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

      setNotice({
        type: "success",
        text: `Account created for ${email}. Redirecting to verify...`,
      });
      setTimeout(() => {
        router.push(`/verify-otp?email=${encodeURIComponent(email)}&otp=${data.dev_otp}`);
      }, 1500);
    } catch (err: any) {
      setNotice({ type: "error", text: err.message || "Registration failed." });
    } finally {
      setLoading(false);
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
        {/* Name row – no icons to keep grid clean */}
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

        {/* Email with envelope icon */}
        <div className={styles.inputWrapper}>
          <Mail className={styles.inputIcon} size={20} />
          <input
            className={`${styles.field} ${styles.fieldLeft} ${styles.fieldWithIcon}`}
            type="email"
            name="email"
            placeholder="Email"
            aria-label="Email"
            autoComplete="email"
            required
          />
        </div>

        {/* Username with user icon */}
        <div className={styles.inputWrapper}>
          <User className={styles.inputIcon} size={20} />
          <input
            className={`${styles.field} ${styles.fieldLeft} ${styles.fieldWithIcon}`}
            type="text"
            name="username"
            placeholder="Username"
            aria-label="Username"
            autoComplete="username"
            required
          />
        </div>

        {/* Phone row – keep prefix and input without icon (or add phone icon inside the input if wanted) */}
        <div className={styles.phoneRow}>
          <span className={styles.phonePrefix}>+233</span>
          <div className={styles.inputWrapper}>
            <Phone className={styles.inputIcon} size={20} />
            <input
              className={`${styles.field} ${styles.fieldLeft} ${styles.fieldWithIcon}`}
              type="tel"
              name="phone"
              placeholder="Phone Number"
              aria-label="Phone number"
              autoComplete="tel-national"
              inputMode="numeric"
              required
            />
          </div>
        </div>

        {/* Password with lock + eye toggle */}
        <div className={`${styles.inputWrapper}`}>
          <Lock className={styles.inputIcon} size={20} />
          <input
            className={`${styles.field} ${styles.fieldLeft} ${styles.fieldWithIcon} ${styles.passwordField}`}
            type={showPassword ? "text" : "password"}
            name="password"
            placeholder="Password"
            aria-label="Password"
            autoComplete="new-password"
            minLength={8}
            required
          />
          <button
            type="button"
            className={styles.togglePassword}
            onClick={() => setShowPassword(!showPassword)}
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
          </button>
        </div>

        {/* Confirm Password with lock + eye toggle */}
        <div className={`${styles.inputWrapper}`}>
          <Lock className={styles.inputIcon} size={20} />
          <input
            className={`${styles.field} ${styles.fieldLeft} ${styles.fieldWithIcon} ${styles.passwordField}`}
            type={showConfirmPassword ? "text" : "password"}
            name="confirm_password"
            placeholder="Confirm Password"
            aria-label="Confirm password"
            autoComplete="new-password"
            minLength={8}
            required
          />
          <button
            type="button"
            className={styles.togglePassword}
            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
            aria-label={showConfirmPassword ? "Hide password" : "Show password"}
          >
            {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
          </button>
        </div>

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