"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CalendarDays,
  Clock3,
  FileText,
  RefreshCw,
  Plus,
} from "lucide-react";

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

  const [
    reservations,
    setReservations,
  ] = useState<Reservation[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState<string | null>(null);

  /* =========================================================
     FETCH RESERVATIONS
  ========================================================= */

  const fetchReservations =
    async () => {
      const token =
        localStorage.getItem(
          "access_token"
        );

      if (!token) {
        setError(
          "Please log in to view your requests."
        );

        setLoading(false);

        return;
      }

      try {
        setLoading(true);
        setError(null);

        const response =
          await api.reservations.myReservations(
            token
          );

        if (
          response.status ===
          401
        ) {
          localStorage.removeItem(
            "access_token"
          );

          localStorage.removeItem(
            "user"
          );

          router.push(
            "/login"
          );

          return;
        }

        if (!response.ok) {
          throw new Error(
            "Failed to fetch reservations."
          );
        }

        const data =
          await response.json();

        setReservations(
          Array.isArray(data)
            ? data
            : []
        );
      } catch (err) {
        console.error(
          "MY REQUESTS FAILED:",
          err
        );

        setError(
          err instanceof Error
            ? err.message
            : "Something went wrong."
        );
      } finally {
        setLoading(false);
      }
    };

  useEffect(() => {
    if (
      auth.status ===
      "checking"
    ) {
      return;
    }

    if (
      auth.status ===
      "signed-out"
    ) {
      setLoading(false);

      return;
    }

    fetchReservations();
  }, [
    auth.status,
    router,
  ]);

  /* =========================================================
     SUBMITTED DATE HELPER
  ========================================================= */

  const formatSubmittedDate =
    (
      value:
        | string
        | undefined
    ) => {
      if (!value) {
        return "Date unavailable";
      }

      const date =
        new Date(value);

      if (
        Number.isNaN(
          date.getTime()
        )
      ) {
        return "Date unavailable";
      }

      return date.toLocaleDateString(
        "en-GH",
        {
          day: "numeric",
          month: "short",
          year: "numeric",
        }
      );
    };

  /* =========================================================
     LOADING
  ========================================================= */

  if (
    auth.status ===
      "checking" ||
    loading
  ) {
    return (
      <div
        className={
          styles.page
        }
      >
        <header
          className={
            styles.header
          }
        >
          <span
            className={
              styles.eyebrow
            }
          >
            Studio
          </span>

          <h1
            className={
              styles.heading
            }
          >
            My Requests
          </h1>

          <p
            className={
              styles.subheading
            }
          >
            Your studio space requests
          </p>
        </header>

        <div
          className={
            styles.stateCard
          }
          role="status"
        >
          <div
            className={
              styles.spinner
            }
          />

          <h2>
            Loading your requests
          </h2>

          <p>
            Please wait while we
            retrieve your studio
            requests.
          </p>
        </div>
      </div>
    );
  }

  /* =========================================================
     SIGNED OUT
  ========================================================= */

  if (
    auth.status ===
    "signed-out"
  ) {
    return (
      <div
        className={
          styles.page
        }
      >
        <header
          className={
            styles.header
          }
        >
          <span
            className={
              styles.eyebrow
            }
          >
            Studio
          </span>

          <h1
            className={
              styles.heading
            }
          >
            My Requests
          </h1>

          <p
            className={
              styles.subheading
            }
          >
            Your studio space requests
          </p>
        </header>

        <div
          className={
            styles.stateCard
          }
        >
          <div
            className={
              styles.stateIcon
            }
          >
            <FileText
              size={28}
            />
          </div>

          <h2>
            Sign in required
          </h2>

          <p>
            Log in to see the studio
            requests you have submitted
            and their current status.
          </p>

          <Link
            href="/login"
            className={
              styles.primaryButton
            }
          >
            Log In
          </Link>
        </div>
      </div>
    );
  }

  /* =========================================================
     ERROR
  ========================================================= */

  if (error) {
    return (
      <div
        className={
          styles.page
        }
      >
        <header
          className={
            styles.header
          }
        >
          <span
            className={
              styles.eyebrow
            }
          >
            Studio
          </span>

          <h1
            className={
              styles.heading
            }
          >
            My Requests
          </h1>

          <p
            className={
              styles.subheading
            }
          >
            Your studio space requests
          </p>
        </header>

        <div
          className={`${styles.stateCard} ${styles.errorCard}`}
        >
          <div
            className={
              styles.errorIcon
            }
          >
            !
          </div>

          <h2>
            Unable to load requests
          </h2>

          <p>
            {error}
          </p>

          <button
            type="button"
            className={
              styles.secondaryButton
            }
            onClick={
              fetchReservations
            }
          >
            <RefreshCw
              size={15}
            />
            Try Again
          </button>
        </div>
      </div>
    );
  }

  /* =========================================================
     EMPTY
  ========================================================= */

  if (
    reservations.length ===
    0
  ) {
    return (
      <div
        className={
          styles.page
        }
      >
        <header
          className={
            styles.header
          }
        >
          <span
            className={
              styles.eyebrow
            }
          >
            Studio
          </span>

          <h1
            className={
              styles.heading
            }
          >
            My Requests
          </h1>

          <p
            className={
              styles.subheading
            }
          >
            Your studio space requests
          </p>
        </header>

        <div
          className={
            styles.stateCard
          }
        >
          <div
            className={
              styles.stateIcon
            }
          >
            <CalendarDays
              size={28}
            />
          </div>

          <h2>
            No requests yet
          </h2>

          <p>
            When you request a studio
            space, your request and its
            status will appear here.
          </p>

          <Link
            href="/rentals/studio"
            className={
              styles.primaryButton
            }
          >
            <Plus
              size={16}
            />
            Request a Studio
          </Link>
        </div>
      </div>
    );
  }

  /* =========================================================
     REQUEST LIST
  ========================================================= */

  return (
    <div
      className={
        styles.page
      }
    >
      <header
        className={
          styles.header
        }
      >
        <div>
          <span
            className={
              styles.eyebrow
            }
          >
            Studio
          </span>

          <h1
            className={
              styles.heading
            }
          >
            My Requests
          </h1>

          <p
            className={
              styles.subheading
            }
          >
            View the studio requests
            you have submitted.
          </p>
        </div>

        <Link
          href="/rentals/studio"
          className={
            styles.headerButton
          }
        >
          <Plus
            size={16}
          />
          New Request
        </Link>
      </header>

      <div
        className={
          styles.list
        }
      >
        {reservations.map(
          (request) => {
            const tone =
              STATUS_TONE[
                request.status
              ] ||
              "waiting";

            const statusLabel =
              STATUS_LABELS[
                request.status
              ] ||
              request.status;

            return (
              <article
                key={
                  request.id
                }
                className={
                  styles.card
                }
              >
                {/* =========================================
                    CARD HEADER
                ========================================= */}

                <div
                  className={
                    styles.cardTop
                  }
                >
                  <div
                    className={
                      styles.cardIcon
                    }
                  >
                    <FileText
                      size={20}
                    />
                  </div>

                  <div
                    className={
                      styles.cardTitleArea
                    }
                  >
                    <span
                      className={
                        styles.cardLabel
                      }
                    >
                      Studio Request
                    </span>

                    <h2
                      className={
                        styles.purpose
                      }
                    >
                      {request.purpose ||
                        "Studio request"}
                    </h2>
                  </div>

                  <span
                    className={`${styles.badge} ${styles[tone]}`}
                  >
                    {statusLabel}
                  </span>
                </div>

                {/* =========================================
                    DATE / TIME
                ========================================= */}

                <div
                  className={
                    styles.cardDetails
                  }
                >
                  <div
                    className={
                      styles.detail
                    }
                  >
                    <CalendarDays
                      size={16}
                    />

                    <div>
                      <span
                        className={
                          styles.detailLabel
                        }
                      >
                        Requested date
                      </span>

                      <strong>
                        {formatRequestDate(
                          request.requested_start
                        )}
                      </strong>
                    </div>
                  </div>

                  <div
                    className={
                      styles.detail
                    }
                  >
                    <Clock3
                      size={16}
                    />

                    <div>
                      <span
                        className={
                          styles.detailLabel
                        }
                      >
                        Requested time
                      </span>

                      <strong>
                        {formatRequestTime(
                          request.requested_start
                        )}{" "}
                        -{" "}
                        {formatRequestTime(
                          request.requested_end
                        )}
                      </strong>
                    </div>
                  </div>
                </div>

                {/* =========================================
                    NOTES
                ========================================= */}

                {request.notes && (
                  <div
                    className={
                      styles.notes
                    }
                  >
                    <span>
                      Notes
                    </span>

                    <p>
                      {
                        request.notes
                      }
                    </p>
                  </div>
                )}

                {/* =========================================
                    REJECTION
                ========================================= */}

                {request.rejection_reason && (
                  <div
                    className={
                      styles.rejection
                    }
                  >
                    <strong>
                      Request not approved
                    </strong>

                    <p>
                      {
                        request.rejection_reason
                      }
                    </p>
                  </div>
                )}

                {/* =========================================
                    FOOTER
                ========================================= */}

                <div
                  className={
                    styles.cardFooter
                  }
                >
                  <span>
                    Submitted
                  </span>

                  <span>
                    {formatSubmittedDate(
                      request.created_at
                    )}
                  </span>
                </div>
              </article>
            );
          }
        )}
      </div>
    </div>
  );
}