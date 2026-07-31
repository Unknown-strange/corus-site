"use client";

import Link from "next/link";
import { useAuthState } from "@/lib/use-signed-in-user";
import {
  DUMMY_RESERVATIONS,
  STATUS_LABELS,
  STATUS_TONE,
  formatRequestDate,
  formatRequestTime,
} from "@/lib/reservations";
import styles from "./MyRequests.module.css";

/**
 * The customer's studio requests.
 *
 * NOT WIRED TO THE API. The endpoint is `GET /reservations/me`, which returns
 * exactly the rows this screen draws — but it is customer-only, so it needs
 * the JWT that LogIn.tsx stores plus an API client to send it. The rows below
 * are placeholder data shaped like `ReservationDetailResponse`.
 *
 * Reached from the profile dropdown in Navbar.tsx, which only renders when
 * someone is signed in. This screen checks anyway — the route can be typed
 * directly, and a signed-out visitor should be sent to /login rather than
 * shown anyone's requests.
 */
export default function MyRequests() {
  const auth = useAuthState();

  return (
    <div className={styles.page}>
      <div className={styles.band}>
        <h1 className={styles.heading}>My Requests</h1>
      </div>

      {auth.status === "checking" ? (
        <div className={styles.message} role="status">
          Checking your account…
        </div>
      ) : auth.status === "signed-out" ? (
        <div className={styles.message}>
          <p className={styles.messageTitle}>You need to be signed in.</p>
          <p>Log in to see the studio requests you have submitted and their status.</p>
          <Link href="/login" className={styles.messageLink}>
            Log In
          </Link>
        </div>
      ) : DUMMY_RESERVATIONS.length === 0 ? (
        <div className={styles.message}>
          <p className={styles.messageTitle}>No requests yet.</p>
          <p>When you request a studio space it will show up here.</p>
          <Link href="/rentals/studio" className={styles.messageLink}>
            Request a Studio
          </Link>
        </div>
      ) : (
        <div className={styles.list}>
          {DUMMY_RESERVATIONS.map((request) => (
            <article key={request.id} className={styles.row}>
              <div className={styles.details}>
                <p className={styles.purpose}>{request.purpose ?? "Studio request"}</p>
                <p className={styles.when}>
                  {formatRequestDate(request.requested_start)} -{" "}
                  <span className={styles.time}>
                    {formatRequestTime(request.requested_start)} -{" "}
                    {formatRequestTime(request.requested_end)}
                  </span>
                </p>
              </div>

              <span className={`${styles.badge} ${styles[STATUS_TONE[request.status]]}`}>
                {STATUS_LABELS[request.status]}
              </span>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
