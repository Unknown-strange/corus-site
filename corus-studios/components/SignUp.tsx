"use client";

import Image from "next/image";
import { useState } from "react";
import styles from "./SignUp.module.css";

const MOSAIC = [
  { src: "/gallery/Aunt Vida.jpg", left: 0, top: 0, width: 283, height: 321, priority: true },
  { src: "/gallery/1.png", left: 294, top: 0, width: 283, height: 487, priority: true },
  { src: "/gallery/4.png", left: 0, top: 331, width: 283, height: 397, priority: false },
  { src: "/gallery/5.png", left: 294, top: 498, width: 283, height: 397, priority: false },
  { src: "/gallery/9.png", left: 3, top: 741, width: 280, height: 321, priority: false },
  { src: "/gallery/10.png", left: 294, top: 902, width: 283, height: 160, priority: false },
];

export default function SignUp() {
  const [notice, setNotice] = useState("");

  /**
   * NOT WIRED TO THE API — deliberate, see docs/FRONTEND.md "Open questions".
   *
   * POST /auth/register accepts exactly:
   *   { first_name, last_name, username, email, password }
   *
   * This form cannot satisfy that contract yet:
   *   - it collects a phone number, which has no column on the User model and
   *     no field on RegisterRequest, so it would be silently discarded;
   *   - it does not collect `username`, which the API requires and which is
   *     also what /auth/login authenticates against.
   *
   * Do not paper over this by deriving a username from the email — customers
   * would end up unable to log in with a credential they never chose. The
   * backend team needs to add `phone` and relax `username` first.
   */
  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setNotice(
      "Not connected yet — the register API has no phone number field and requires a username this form doesn't collect."
    );
  }

  return (
    <div className={styles.screen}>
      <div className={styles.frame}>
        {/* Decorative portfolio imagery — conveys no information to a screen reader. */}
        <div className={styles.mosaic} aria-hidden="true">
          {MOSAIC.map((shot) => (
            <div
              key={shot.src}
              className={styles.shot}
              style={
                {
                  "--l": shot.left,
                  "--t": shot.top,
                  "--w": shot.width,
                  "--h": shot.height,
                } as React.CSSProperties
              }
            >
              <Image
                src={shot.src}
                alt=""
                fill
                sizes="(min-width: 1024px) 21vw, 0px"
                priority={shot.priority}
                className={styles.shotImage}
              />
            </div>
          ))}
        </div>

        <div className={styles.panel}>
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

            <button className={styles.submit} type="submit">
              Sign Up
            </button>
          </form>

          {notice ? (
            <p className={styles.notice} role="status">
              {notice}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
