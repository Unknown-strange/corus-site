"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { User, Lock, Eye, EyeOff } from "lucide-react";
import styles from "./LogIn.module.css";

type Notice = {
  type: "success" | "error";
  text: string;
};

export default function LogIn() {
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);

  async function handleSubmit(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();
    setNotice(null);

    const form = event.currentTarget;
    const formData = new FormData(form);

    const username = String(formData.get("username") || "").trim();
    const password = String(formData.get("password") || "");

    if (!username || !password) {
      setNotice({
        type: "error",
        text: "Please fill in all fields.",
      });
      return;
    }

    setLoading(true);

    try {
      const apiBase =
        process.env.NEXT_PUBLIC_API_URL ||
        "http://localhost:8000";

      const loginUrl = `${apiBase}/auth/login`;

      console.log("Login API:", loginUrl);

      const loginResponse = await fetch(loginUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username,
          password,
        }),
      });

      let loginData: any = null;

      try {
        loginData = await loginResponse.json();
      } catch {
        loginData = null;
      }

      if (!loginResponse.ok) {
        let errorMessage =
          "Login failed. Please check your credentials.";

        if (loginData?.detail) {
          if (Array.isArray(loginData.detail)) {
            errorMessage = loginData.detail
              .map((error: any) => error.msg)
              .join(", ");
          } else {
            errorMessage = loginData.detail;
          }
        }

        throw new Error(errorMessage);
      }

      if (!loginData?.access_token) {
        throw new Error(
          "Login succeeded, but no access token was returned."
        );
      }

      // Save token
      localStorage.setItem(
        "access_token",
        loginData.access_token
      );

      // Get logged-in user's information
      const meResponse = await fetch(
        `${apiBase}/auth/me`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${loginData.access_token}`,
          },
        }
      );

      let userData: any = null;

      try {
        userData = await meResponse.json();
      } catch {
        userData = null;
      }

      if (!meResponse.ok) {
        throw new Error(
          userData?.detail ||
            "Failed to fetch user details."
        );
      }

      // Save user information
      localStorage.setItem(
        "user",
        JSON.stringify({
          username: userData.username,
          firstName: userData.first_name,
          lastName: userData.last_name,
          email: userData.email,
          phone: userData.phone_number,
        })
      );

      setNotice({
        type: "success",
        text: "Login successful! Redirecting...",
      });

      setTimeout(() => {
        router.push("/");
      }, 1000);
    } catch (error: unknown) {
      console.error("LOGIN ERROR:", error);

      if (error instanceof TypeError) {
        setNotice({
          type: "error",
          text:
            "Unable to connect to the server. Please try again later.",
        });
      } else if (error instanceof Error) {
        setNotice({
          type: "error",
          text: error.message,
        });
      } else {
        setNotice({
          type: "error",
          text: "Something went wrong while logging in.",
        });
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={styles.loginContainer}>
      {/* Header */}

      <div className={styles.header}>
        <Image
          src="/icons/Profile.png"
          alt=""
          width={51}
          height={51}
          className={styles.icon}
        />

        <h1 className={styles.title}>
          Log In
        </h1>
      </div>

      <p className={styles.subtitle}>
        Log in to continue.
      </p>

      {/* Form */}

      <form
        className={styles.form}
        onSubmit={handleSubmit}
      >
        {/* Username */}

        <div className={styles.inputWrapper}>
          <User
            className={styles.inputIcon}
            size={20}
          />

          <input
            className={`${styles.field} ${styles.fieldWithIcon}`}
            type="text"
            name="username"
            placeholder="Username"
            aria-label="Username"
            autoComplete="username"
            required
          />
        </div>

        {/* Password */}

        <div
          className={`${styles.inputWrapper} ${styles.passwordWrapper}`}
        >
          <Lock
            className={styles.inputIcon}
            size={20}
          />

          <input
            className={`${styles.field} ${styles.fieldWithIcon} ${styles.passwordField}`}
            type={
              showPassword
                ? "text"
                : "password"
            }
            name="password"
            placeholder="Password"
            aria-label="Password"
            autoComplete="current-password"
            required
          />

          <button
            type="button"
            className={styles.togglePassword}
            onClick={() =>
              setShowPassword(
                (current) => !current
              )
            }
            aria-label={
              showPassword
                ? "Hide password"
                : "Show password"
            }
          >
            {showPassword ? (
              <EyeOff size={20} />
            ) : (
              <Eye size={20} />
            )}
          </button>
        </div>

        {/* Forgot Password */}

        <Link
          href="/forgot-password"
          className={styles.forgot}
        >
          Forgot Password?
        </Link>

        {/* Submit */}

        <button
          className={styles.submit}
          type="submit"
          disabled={loading}
        >
          {loading
            ? "Logging in..."
            : "Log In"}
        </button>
      </form>

      {/* Sign Up */}

      <p className={styles.footer}>
        Don&rsquo;t have an account?{" "}

        <Link
          href="/signup"
          className={styles.footerLink}
        >
          Sign Up
        </Link>
      </p>

      {/* Notice */}

      {notice && (
        <p
          className={`${styles.notice} ${
            notice.type === "success"
              ? styles.successNotice
              : styles.errorNotice
          }`}
          role="alert"
        >
          {notice.text}
        </p>
      )}
    </div>
  );
}