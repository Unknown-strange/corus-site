"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import styles from "./AdminLogIn.module.css";

export default function AdminLogIn() {
  const [notice, setNotice] = useState("");

  /**
   * NOT WIRED YET — but unlike the customer screens, nothing about the API
   * contract blocks it.
   *
   * POST /auth/login takes { username, password }, which is exactly what this
   * form collects, for admin and staff alike. What's missing is frontend
   * plumbing, not a backend change:
   *   - NEXT_PUBLIC_API_URL and a lib/api client;
   *   - a decision on token storage (localStorage vs httpOnly cookie);
   *   - reading `role` and `permissions` off GET /auth/me to route into the
   *     admin portal and gate its navigation.
   *
   * See docs/FRONTEND.md "Project conventions" for the open decisions.
   */
  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setNotice("Not connected yet — the API client and token storage still need to be set up.");
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
        <h1 className={styles.title}>Admin Log In</h1>
      </div>

      <p className={styles.subtitle}>Log in to continue.</p>

      <form className={styles.form} onSubmit={handleSubmit}>
        <input
          className={styles.field}
          type="text"
          name="username"
          placeholder="Username"
          aria-label="Username"
          autoComplete="username"
          minLength={3}
          required
        />

        <input
          className={`${styles.field} ${styles.password}`}
          type="password"
          name="password"
          placeholder="Password"
          aria-label="Password"
          autoComplete="current-password"
          required
        />

        <Link href="/forgot-password" className={styles.forgot}>
          Forgot Password?
        </Link>

        <button className={styles.submit} type="submit">
          Log In
        </button>
      </form>

      {notice ? (
        <p className={styles.notice} role="status">
          {notice}
        </p>
      ) : null}
    </>
  );
}
