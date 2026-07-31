"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { User, Lock, Eye, EyeOff } from "lucide-react";
import styles from "./LogIn.module.css";

export default function LogIn() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [notice, setNotice] = useState<{ type: "success" | "error"; text: string } | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setNotice(null);

    const form = event.currentTarget;
    const formData = new FormData(form);

    const username = formData.get("username") as string;
    const password = formData.get("password") as string;

    if (!username || !password) {
      setNotice({ type: "error", text: "Please fill in all fields." });
      return;
    }

    setLoading(true);

    try {
      const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

      const loginResponse = await fetch(`${apiBase}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const loginData = await loginResponse.json();

      if (!loginResponse.ok) {
        let errorMsg = "Login failed. Please check your credentials.";
        if (loginData.detail) {
          if (Array.isArray(loginData.detail)) {
            errorMsg = loginData.detail.map((err: any) => err.msg).join(", ");
          } else {
            errorMsg = loginData.detail;
          }
        }
        throw new Error(errorMsg);
      }

      localStorage.setItem("access_token", loginData.access_token);

      const meResponse = await fetch(`${apiBase}/auth/me`, {
        headers: {
          Authorization: `Bearer ${loginData.access_token}`,
        },
      });

      if (!meResponse.ok) {
        throw new Error("Failed to fetch user details.");
      }

      const userData = await meResponse.json();

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

      setNotice({ type: "success", text: "Login successful! Redirecting..." });
      setTimeout(() => {
        router.push("/");
      }, 1000);
    } catch (err: any) {
      setNotice({ type: "error", text: err.message || "Something went wrong." });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={styles.loginContainer}> {/* ← new wrapper */}
      <div className={styles.header}>
        <Image
          src="/icons/Profile.png"
          alt=""
          width={51}
          height={51}
          className={styles.icon}
        />
        <h1 className={styles.title}>Log In</h1>
      </div>

      <p className={styles.subtitle}>Log in to continue.</p>

      <form className={styles.form} onSubmit={handleSubmit}>
        {/* Username field */}
        <div className={styles.inputWrapper}>
          <User className={styles.inputIcon} size={20} />
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

        {/* Password field */}
        <div className={`${styles.inputWrapper} ${styles.passwordWrapper}`}>
          <Lock className={styles.inputIcon} size={20} />
          <input
            className={`${styles.field} ${styles.fieldWithIcon} ${styles.passwordField}`}
            type={showPassword ? "text" : "password"}
            name="password"
            placeholder="Password"
            aria-label="Password"
            autoComplete="current-password"
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

        <Link href="/forgot-password" className={styles.forgot}>
          Forgot Password?
        </Link>

        <button className={styles.submit} type="submit" disabled={loading}>
          {loading ? "Logging in..." : "Log In"}
        </button>
      </form>

      <p className={styles.footer}>
        Don&rsquo;t have an account?{" "}
        <Link href="/signup" className={styles.footerLink}>
          Sign Up
        </Link>
      </p>

      {notice && (
        <p
          className={`${styles.notice} ${
            notice.type === "success" ? styles.successNotice : styles.errorNotice
          }`}
          role="status"
        >
          {notice.text}
        </p>
      )}
    </div>
  );
}