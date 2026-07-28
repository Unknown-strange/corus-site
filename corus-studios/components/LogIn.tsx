"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import styles from "./LogIn.module.css";

export default function LogIn() {
  const [notice, setNotice] = useState("");

  /**
   * NOT WIRED TO THE API — same class of mismatch as Sign Up, see
   * docs/FRONTEND.md "Open questions".
   *
   * POST /auth/login accepts { username, password }. This form collects an
   * email address, and the API does not authenticate on email — so there is
   * nothing correct to send. Resolving the Sign Up blocker (phone + username)
   * settles this one too: whatever customers register with is what they log
   * in with.
   */
  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setNotice(
      "Not connected yet — the login API authenticates on username, and this form collects an email address."
    );
  }

  /**
   * There is no Google sign-in on the backend: no OAuth routes, no provider
   * config, no social-account columns on the User model. This button is a
   * design placeholder until that feature is actually scoped.
   */
  function handleGoogle() {
    setNotice("Google sign-in isn't available — the backend has no OAuth support yet.");
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
        <h1 className={styles.title}>Log In</h1>
      </div>

      <p className={styles.subtitle}>Log in to continue.</p>

      <form className={styles.form} onSubmit={handleSubmit}>
        <input
          className={styles.field}
          type="email"
          name="email"
          placeholder="Email"
          aria-label="Email"
          autoComplete="email"
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

      <p className={styles.divider}>Sign In Options</p>

      <button className={styles.googleButton} type="button" onClick={handleGoogle}>
        <Image
          src="/icons/google.png"
          alt=""
          width={36}
          height={36}
          className={styles.googleIcon}
        />
        Continue with Google
      </button>

      <p className={styles.footer}>
        Don&rsquo;t have an account?{" "}
        <Link href="/signup" className={styles.footerLink}>
          Sign Up
        </Link>
      </p>

      {notice ? (
        <p className={styles.notice} role="status">
          {notice}
        </p>
      ) : null}
    </>
  );
}
