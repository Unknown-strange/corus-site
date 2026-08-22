"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import Link from "next/link";

import {
  CalendarDays,
  Clock3,
  Footprints,
  RefreshCw,
  ReceiptText,
  AlertCircle,
} from "lucide-react";

import Navbar from "@/components/Navbar";
import Map from "@/components/Map";
import Footer from "@/components/Footer";

import styles from "./page.module.css";

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:8000";

/* =========================================================
   NORMAL BOOKING
========================================================= */

type ApiBooking = {
  id: string;
  status: string;

  deposit_amount_ghs: string;
  total_price_ghs: string;
  balance_due_ghs: string;

  paystack_reference:
    | string
    | null;

  confirmed_at:
    | string
    | null;

  created_at: string;

  session_type_name: string;

  slot_starts_at: string;
  slot_ends_at: string;

  receipt: {
    receipt_number: string;
    amount_ghs: string;
    issued_at: string;
  } | null;
};

/* =========================================================
   WALK-IN BOOKING
========================================================= */

type ApiWalkInBooking = {
  id: string;
  status: string;
  booking_source: string;
  payment_method: string;

  customer_full_name: string;
  customer_email:
    | string
    | null;
  customer_phone: string;

  package_name: string;

  package_description:
    | string
    | null;

  package_price_ghs: string;
  package_duration_minutes: number;
  pictures_count: number;

  picture_pickup_date:
    | string
    | null;

  accepted_at:
    | string
    | null;

  deposit_amount_ghs: string;
  total_price_ghs: string;
  balance_due_ghs: string;

  paystack_reference:
    | string
    | null;

  slot_starts_at: string;
  slot_ends_at: string;

  confirmed_at:
    | string
    | null;

  created_at: string;

  receipt_number:
    | string
    | null;
};

/* =========================================================
   COMBINED UI MODEL
========================================================= */

type BookingItem = {
  id: string;

  title: string;

  date: string;

  time: string;

  price: number;

  status: string;

  source:
    | "online"
    | "walk-in";

  receiptNumber:
    | string
    | null;

  rawStart: string;
};

/* =========================================================
   HELPERS
========================================================= */

function formatMoney(
  value: string | number
) {
  const amount =
    Number(value);

  if (
    !Number.isFinite(
      amount
    )
  ) {
    return "GH₵0.00";
  }

  return `GH₵${amount.toLocaleString(
    "en-GH",
    {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }
  )}`;
}

function formatDate(
  value: string
) {
  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return value;
  }

  return date.toLocaleDateString(
    "en-US",
    {
      month: "long",
      day: "numeric",
      year: "numeric",
    }
  );
}

function formatTime(
  value: string
) {
  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return value;
  }

  return date.toLocaleTimeString(
    "en-US",
    {
      hour: "2-digit",
      minute: "2-digit",
    }
  );
}

function formatStatus(
  status: string
) {
  if (!status) {
    return "Confirmed";
  }

  return status
    .replace(
      /[_-]+/g,
      " "
    )
    .replace(
      /\b\w/g,
      (letter) =>
        letter.toUpperCase()
    );
}

function getStatusTone(
  status: string
) {
  const normalized =
    status
      .toLowerCase()
      .replace(
        /[_-]+/g,
        " "
      );

  if (
    normalized.includes(
      "confirmed"
    ) ||
    normalized.includes(
      "approved"
    ) ||
    normalized.includes(
      "paid"
    ) ||
    normalized.includes(
      "completed"
    )
  ) {
    return "success";
  }

  if (
    normalized.includes(
      "rejected"
    ) ||
    normalized.includes(
      "cancelled"
    ) ||
    normalized.includes(
      "failed"
    )
  ) {
    return "danger";
  }

  return "pending";
}

/* =========================================================
   PAGE
========================================================= */

export default function BookingPage() {
  const [
    bookings,
    setBookings,
  ] =
    useState<BookingItem[]>(
      []
    );

  const [
    loading,
    setLoading,
  ] =
    useState(true);

  const [
    refreshing,
    setRefreshing,
  ] =
    useState(false);

  const [
    error,
    setError,
  ] =
    useState<string | null>(
      null
    );

  /*
   * IMPORTANT:
   *
   * This is different from "0 walk-in bookings".
   *
   * false = backend endpoint isn't available,
   * true  = backend endpoint exists.
   */
  const [
    walkInAvailable,
    setWalkInAvailable,
  ] =
    useState(false);

  /* =========================================================
     FETCH
  ========================================================= */

  const fetchBookings =
    async (
      showLoader = true
    ) => {
      if (
        showLoader
      ) {
        setLoading(
          true
        );
      }

      setRefreshing(
        !showLoader
      );

      setError(
        null
      );

      try {
        const token =
          localStorage.getItem(
            "access_token"
          );

        if (!token) {
          setError(
            "Please log in to view your bookings."
          );

          return;
        }

        /* =====================================================
           NORMAL BOOKINGS
        ===================================================== */

        const normalResponse =
          await fetch(
            `${API_BASE}/sessions/bookings/me`,
            {
              headers: {
                Authorization:
                  `Bearer ${token}`,
                Accept:
                  "application/json",
              },
            }
          );

        if (
          normalResponse.status ===
          401
        ) {
          localStorage.removeItem(
            "access_token"
          );

          localStorage.removeItem(
            "user"
          );

          setError(
            "Your session has expired. Please log in again."
          );

          return;
        }

        if (
          !normalResponse.ok
        ) {
          const raw =
            await normalResponse.text();

          let message =
            "Failed to load bookings.";

          try {
            const data =
              JSON.parse(
                raw
              );

            if (
              typeof data?.detail ===
              "string"
            ) {
              message =
                data.detail;
            }
          } catch {
            // Keep fallback.
          }

          throw new Error(
            message
          );
        }

        const normalData =
          (await normalResponse.json()) as ApiBooking[];

        /* =====================================================
           MAP NORMAL BOOKINGS
        ===================================================== */

        const normalBookings: BookingItem[] =
          normalData.map(
            (
              booking
            ) => ({
              id:
                `online-${booking.id}`,

              title:
                booking.session_type_name ||
                "Studio Session",

              date:
                formatDate(
                  booking.slot_starts_at
                ),

              time:
                `${formatTime(
                  booking.slot_starts_at
                )} – ${formatTime(
                  booking.slot_ends_at
                )}`,

              price:
                Number.parseFloat(
                  booking.total_price_ghs
                ) || 0,

              status:
                booking.status,

              source:
                "online",

              receiptNumber:
                booking.receipt
                  ?.receipt_number ||
                null,

              rawStart:
                booking.slot_starts_at,
            })
          );

        /* =====================================================
           WALK-IN BOOKINGS
        ===================================================== */

        let walkInBookings: BookingItem[] =
          [];

        /*
         * Reset before checking again.
         */
        setWalkInAvailable(
          false
        );

        try {
          const walkInResponse =
            await fetch(
              `${API_BASE}/sessions/walk-in-bookings/me`,
              {
                headers: {
                  Authorization:
                    `Bearer ${token}`,
                  Accept:
                    "application/json",
                },
              }
            );

          /*
           * 404 means the endpoint doesn't exist yet.
           *
           * We deliberately do NOT show:
           * - Walk-in count
           * - Walk-in summary card
           * - Warning banner
           */
          if (
            walkInResponse.status ===
            404
          ) {
            console.log(
              "Walk-in bookings endpoint is not available."
            );
          } else if (
            walkInResponse.status ===
            401
          ) {
            localStorage.removeItem(
              "access_token"
            );

            localStorage.removeItem(
              "user"
            );

            setError(
              "Your session has expired. Please log in again."
            );

            return;
          } else if (
            walkInResponse.ok
          ) {
            const data =
              (await walkInResponse.json()) as ApiWalkInBooking[];

            setWalkInAvailable(
              true
            );

            walkInBookings =
              data.map(
                (
                  booking
                ) => ({
                  id:
                    `walkin-${booking.id}`,

                  title:
                    booking.package_name ||
                    "Walk-In Session",

                  date:
                    formatDate(
                      booking.slot_starts_at
                    ),

                  time:
                    `${formatTime(
                      booking.slot_starts_at
                    )} – ${formatTime(
                      booking.slot_ends_at
                    )}`,

                  price:
                    Number.parseFloat(
                      booking.total_price_ghs
                    ) || 0,

                  status:
                    booking.status,

                  source:
                    "walk-in",

                  receiptNumber:
                    booking.receipt_number ||
                    null,

                  rawStart:
                    booking.slot_starts_at,
                })
              );
          } else {
            /*
             * Endpoint exists, but something went wrong.
             *
             * We don't make the whole page fail.
             * We simply don't display walk-in data.
             */
            console.warn(
              "Unable to load walk-in bookings:",
              walkInResponse.status
            );
          }
        } catch (
          walkInError
        ) {
          /*
           * Normal bookings remain usable even when the
           * optional walk-in endpoint fails.
           */
          console.warn(
            "Walk-in bookings request failed:",
            walkInError
          );
        }

        /* =====================================================
           COMBINE + SORT
        ===================================================== */

        const combined = [
          ...normalBookings,
          ...walkInBookings,
        ].sort(
          (
            a,
            b
          ) =>
            new Date(
              a.rawStart
            ).getTime() -
            new Date(
              b.rawStart
            ).getTime()
        );

        setBookings(
          combined
        );
      } catch (
        err
      ) {
        console.error(
          "BOOKINGS LOAD FAILED",
          err
        );

        setError(
          err instanceof Error
            ? err.message
            : "Failed to load bookings."
        );
      } finally {
        setLoading(
          false
        );

        setRefreshing(
          false
        );
      }
    };

  /* =========================================================
     INITIAL LOAD
  ========================================================= */

  useEffect(() => {
    fetchBookings();

    // This page intentionally loads once on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* =========================================================
     COUNTS
  ========================================================= */

  const onlineCount =
    useMemo(
      () =>
        bookings.filter(
          (
            booking
          ) =>
            booking.source ===
            "online"
        ).length,
      [bookings]
    );

  const walkInCount =
    useMemo(
      () =>
        bookings.filter(
          (
            booking
          ) =>
            booking.source ===
            "walk-in"
        ).length,
      [bookings]
    );

  /* =========================================================
     LOADING
  ========================================================= */

  if (
    loading
  ) {
    return (
      <>
        <Navbar />

        <main
          className={
            styles.page
          }
        >
          <div
            className={
              styles.container
            }
          >
            <header
              className={
                styles.hero
              }
            >
              <div>
                <span
                  className={
                    styles.eyebrow
                  }
                >
                  Corus Studios
                </span>

                <h1
                  className={
                    styles.heading
                  }
                >
                  My Bookings
                </h1>

                <p
                  className={
                    styles.subheading
                  }
                >
                  Loading your sessions...
                </p>
              </div>
            </header>

            <div
              className={
                styles.loadingGrid
              }
            >
              {Array.from({
                length: 3,
              }).map(
                (_, index) => (
                  <div
                    key={
                      index
                    }
                    className={
                      styles.skeleton
                    }
                  />
                )
              )}
            </div>
          </div>
        </main>

        <Map />

        <Footer />
      </>
    );
  }

  /* =========================================================
     ERROR
  ========================================================= */

  if (
    error
  ) {
    return (
      <>
        <Navbar />

        <main
          className={
            styles.page
          }
        >
          <div
            className={
              styles.container
            }
          >
            <header
              className={
                styles.hero
              }
            >
              <div>
                <span
                  className={
                    styles.eyebrow
                  }
                >
                  Corus Studios
                </span>

                <h1
                  className={
                    styles.heading
                  }
                >
                  My Bookings
                </h1>
              </div>
            </header>

            <div
              className={
                styles.errorCard
              }
            >
              <AlertCircle
                size={28}
              />

              <h2>
                Unable to load bookings
              </h2>

              <p>
                {error}
              </p>

              <button
                type="button"
                className={
                  styles.primaryButton
                }
                onClick={() =>
                  fetchBookings()
                }
              >
                Try Again
              </button>
            </div>
          </div>
        </main>

        <Map />

        <Footer />
      </>
    );
  }

  /* =========================================================
     MAIN PAGE
  ========================================================= */

  return (
    <>
      <Navbar />

      <main
        className={
          styles.page
        }
      >
        <div
          className={
            styles.container
          }
        >
          {/* =================================================
              HEADER
          ================================================= */}

          <header
            className={
              styles.hero
            }
          >
            <div>
              <span
                className={
                  styles.eyebrow
                }
              >
                Corus Studios
              </span>

              <h1
                className={
                  styles.heading
                }
              >
                My Bookings
              </h1>

              <p
                className={
                  styles.subheading
                }
              >
                View your upcoming and
                previous studio sessions.
              </p>
            </div>

            <button
              type="button"
              className={
                styles.refreshButton
              }
              onClick={() =>
                fetchBookings(
                  false
                )
              }
              disabled={
                refreshing
              }
            >
              <RefreshCw
                size={15}
                className={
                  refreshing
                    ? styles.spin
                    : ""
                }
              />

              Refresh
            </button>
          </header>

          {/* =================================================
              SUMMARY
              
              Only show walk-in information when the backend
              endpoint actually exists.
          ================================================= */}

          <div
            className={`${styles.summary} ${
              walkInAvailable
                ? styles.summaryThree
                : styles.summaryTwo
            }`}
          >
            <div
              className={
                styles.summaryCard
              }
            >
              <div
                className={
                  styles.summaryIcon
                }
              >
                <CalendarDays
                  size={18}
                />
              </div>

              <div>
                <strong>
                  {bookings.length}
                </strong>

                <span>
                  Total Bookings
                </span>
              </div>
            </div>

            <div
              className={
                styles.summaryCard
              }
            >
              <div
                className={
                  styles.summaryIcon
                }
              >
                <Clock3
                  size={18}
                />
              </div>

              <div>
                <strong>
                  {onlineCount}
                </strong>

                <span>
                  Online Bookings
                </span>
              </div>
            </div>

            {walkInAvailable && (
              <div
                className={
                  styles.summaryCard
                }
              >
                <div
                  className={`${styles.summaryIcon} ${styles.walkInIcon}`}
                >
                  <Footprints
                    size={18}
                  />
                </div>

                <div>
                  <strong>
                    {walkInCount}
                  </strong>

                  <span>
                    Walk-In Bookings
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* =================================================
              BOOKING LIST
          ================================================= */}

          <section
            className={
              styles.bookingsList
            }
          >
            {bookings.length ===
            0 ? (
              <div
                className={
                  styles.emptyState
                }
              >
                <div
                  className={
                    styles.emptyIcon
                  }
                >
                  <CalendarDays
                    size={27}
                  />
                </div>

                <h2>
                  No bookings yet
                </h2>

                <p>
                  Your studio sessions will
                  appear here once you make a
                  booking.
                </p>

                <Link
                  href="/booking/session"
                  className={
                    styles.primaryButton
                  }
                >
                  Book a Session
                </Link>
              </div>
            ) : (
              bookings.map(
                (
                  booking
                ) => {
                  const tone =
                    getStatusTone(
                      booking.status
                    );

                  return (
                    <article
                      key={
                        booking.id
                      }
                      className={
                        styles.bookingCard
                      }
                    >
                      {/* -----------------------------------
                          DATE BLOCK
                      ----------------------------------- */}

                      <div
                        className={
                          styles.dateBlock
                        }
                      >
                        <span
                          className={
                            styles.dateMonth
                          }
                        >
                          {new Date(
                            booking.rawStart
                          ).toLocaleDateString(
                            "en-US",
                            {
                              month:
                                "short",
                            }
                          )}
                        </span>

                        <strong
                          className={
                            styles.dateDay
                          }
                        >
                          {new Date(
                            booking.rawStart
                          ).getDate()}
                        </strong>

                        <span
                          className={
                            styles.dateYear
                          }
                        >
                          {new Date(
                            booking.rawStart
                          ).getFullYear()}
                        </span>
                      </div>

                      {/* -----------------------------------
                          MAIN CONTENT
                      ----------------------------------- */}

                      <div
                        className={
                          styles.bookingContent
                        }
                      >
                        <div
                          className={
                            styles.bookingTop
                          }
                        >
                          <div>
                            <span
                              className={
                                styles.bookingLabel
                              }
                            >
                              Studio Session
                            </span>

                            <h2>
                              {
                                booking.title
                              }
                            </h2>
                          </div>

                          {walkInAvailable &&
                            booking.source ===
                              "walk-in" && (
                              <span
                                className={`${styles.sourceBadge} ${styles.walkInBadge}`}
                              >
                                <Footprints
                                  size={11}
                                />

                                Walk-In
                              </span>
                            )}

                          {booking.source ===
                            "online" && (
                            <span
                              className={`${styles.sourceBadge} ${styles.onlineBadge}`}
                            >
                              <CalendarDays
                                size={11}
                              />

                              Online
                            </span>
                          )}
                        </div>

                        <div
                          className={
                            styles.bookingMeta
                          }
                        >
                          <span>
                            <CalendarDays
                              size={14}
                            />

                            {
                              booking.date
                            }
                          </span>

                          <span>
                            <Clock3
                              size={14}
                            />

                            {
                              booking.time
                            }
                          </span>
                        </div>
                      </div>

                      {/* -----------------------------------
                          PRICE / STATUS
                      ----------------------------------- */}

                      <div
                        className={
                          styles.bookingSide
                        }
                      >
                        <strong
                          className={
                            styles.price
                          }
                        >
                          {formatMoney(
                            booking.price
                          )}
                        </strong>

                        <span
                          className={`${styles.statusBadge} ${styles[tone]}`}
                        >
                          {
                            booking.status
                              ? formatStatus(
                                  booking.status
                                )
                              : "Confirmed"}
                        </span>

                        {booking.receiptNumber && (
                          <span
                            className={
                              styles.receipt
                            }
                          >
                            <ReceiptText
                              size={11}
                            />

                            {
                              booking.receiptNumber
                            }
                          </span>
                        )}
                      </div>
                    </article>
                  );
                }
              )
            )}
          </section>
        </div>
      </main>

      <Map />

      <Footer />
    </>
  );
}