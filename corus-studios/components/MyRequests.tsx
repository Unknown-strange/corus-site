"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthState } from "@/lib/use-signed-in-user";
import {
  Reservation,
  STATUS_LABELS,
  STATUS_TONE,
  formatRequestDate,
  formatRequestTime,
} from "@/lib/reservations";
import api from "@/lib/api";
import styles from "./MyRequests.module.css";

export default function MyRequests() {
  const router = useRouter();
  const auth = useAuthState();

  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ─── Fetch reservations when user is signed in ────────────────
  useEffect(() => {
    if (auth.status === "checking") return;
    if (auth.status === "signed-out") {
      setLoading(false);
      return;
    }

    const fetchReservations = async () => {
      const token = localStorage.getItem("access_token");
      if (!token) {
        setError("Please log in to view your requests.");
        setLoading(false);
        return;
      }

      try {
        const res = await api.reservations.myReservations(token);
        if (!res.ok) {
          if (res.status === 401) {
            localStorage.removeItem("access_token");
            localStorage.removeItem("user");
            router.push("/login");
            return;
          }
          throw new Error("Failed to fetch reservations");
        }
        const data = await res.json();
        setReservations(data);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong.");
      } finally {
        setLoading(false);
      }
    };

    fetchReservations();
  }, [auth.status, router]);

  // ─── Loading state ────────────────────────────────────────────
  if (auth.status === "checking" || loading) {
    return (
      <div className={styles.page}>
        <div className={styles.band}>
          <h1 className={styles.heading}>My Requests</h1>
        </div>
        <div className={styles.message} role="status">
          Loading your requests…
        </div>
      </div>
    );
  }

  // ─── Signed out ──────────────────────────────────────────────
  if (auth.status === "signed-out") {
    return (
      <div className={styles.page}>
        <div className={styles.band}>
          <h1 className={styles.heading}>My Requests</h1>
        </div>
        <div className={styles.message}>
          <p className={styles.messageTitle}>You need to be signed in.</p>
          <p>Log in to see the studio requests you have submitted and their status.</p>
          <Link href="/login" className={styles.messageLink}>
            Log In
          </Link>
        </div>
      </div>
    );
  }

  // ─── Error ────────────────────────────────────────────────────
  if (error) {
    return (
      <div className={styles.page}>
        <div className={styles.band}>
          <h1 className={styles.heading}>My Requests</h1>
        </div>
        <div className={styles.message}>
          <p className={styles.messageTitle}>Error</p>
          <p>{error}</p>
          <button
            className={styles.messageLink}
            onClick={() => window.location.reload()}
            style={{ background: "none", border: "none", cursor: "pointer" }}
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // ─── Empty state ──────────────────────────────────────────────
  if (reservations.length === 0) {
    return (
      <div className={styles.page}>
        <div className={styles.band}>
          <h1 className={styles.heading}>My Requests</h1>
        </div>
        <div className={styles.message}>
          <p className={styles.messageTitle}>No requests yet.</p>
          <p>When you request a studio space it will show up here.</p>
          <Link href="/rentals/studio" className={styles.messageLink}>
            Request a Studio
          </Link>
        </div>
      </div>
    );
  }

  // ─── List ─────────────────────────────────────────────────────
  return (
    <div className={styles.page}>
      <div className={styles.band}>
        <h1 className={styles.heading}>My Requests</h1>
      </div>

      <div className={styles.list}>
        {reservations.map((request) => (
          <article key={request.id} className={styles.row}>
            <div className={styles.details}>
              <p className={styles.purpose}>
                {request.purpose ?? "Studio request"}
                {request.rejection_reason && (
                  <span className={styles.rejectionReason}>
                    {" "}
                    — {request.rejection_reason}
                  </span>
                )}
              </p>
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
    </div>
  );
}