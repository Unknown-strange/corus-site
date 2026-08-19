"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  CalendarDays,
  Clock3,
  UserRound,
  ArrowRight,
  CheckCircle2,
  RefreshCw,
  Filter,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

import NavbarAdmin from "@/components/NavbarAdmin";
import Footer from "@/components/Footer";

import styles from "./page.module.css";

type Booking = {
  id: string;
  user_id: string;
  status: string;
  deposit_amount_ghs: string;
  total_price_ghs: string;
  balance_due_ghs: string;
  session_type_name: string;
  slot_starts_at: string;
  slot_ends_at: string;
  confirmed_at: string | null;
  created_at: string;
};

type BookingsResponse = {
  items: Booking[];
  total: number;
  page: number;
  limit: number;
  pages: number;
};

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:8000";

function formatMoney(value: string) {
  const amount = Number(value);

  if (Number.isNaN(amount)) {
    return `GH₵${value}`;
  }

  return `GH₵${amount.toLocaleString("en-GH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatTime(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleTimeString("en-GH", {
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatStatus(status: string) {
  return status
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (letter) =>
      letter.toUpperCase()
    );
}

function getStatusClass(status: string) {
  const normalized = status.toLowerCase();

  if (
    normalized.includes("confirm") ||
    normalized.includes("complete") ||
    normalized.includes("paid") ||
    normalized.includes("approved")
  ) {
    return styles.completed;
  }

  if (
    normalized.includes("cancel") ||
    normalized.includes("reject") ||
    normalized.includes("failed")
  ) {
    return styles.cancelled;
  }

  return styles.pending;
}

export default function BookingsAdmin() {
  const [bookings, setBookings] = useState<Booking[]>(
    []
  );

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [error, setError] =
    useState<string | null>(null);

  const [statusFilter, setStatusFilter] =
    useState("");

  const [bookingDate, setBookingDate] =
    useState("");

  const [page, setPage] =
    useState(1);

  const [pages, setPages] =
    useState(1);

  const [total, setTotal] =
    useState(0);

  const limit = 10;

  const fetchBookings = async (
    showRefresh = false
  ) => {
    try {
      if (showRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError(null);

      const token =
        localStorage.getItem(
          "access_token"
        );

      if (!token) {
        window.location.href = "/login";
        return;
      }

      const params = new URLSearchParams();

      params.set(
        "page",
        page.toString()
      );

      params.set(
        "limit",
        limit.toString()
      );

      if (statusFilter) {
        params.set(
          "status",
          statusFilter
        );
      }

      if (bookingDate) {
        params.set(
          "booking_date",
          `${bookingDate}T00:00:00.000Z`
        );
      }

      const response =
        await fetch(
          `${API_BASE}/admin/bookings?${params.toString()}`,
          {
            method: "GET",
            headers: {
              Authorization:
                `Bearer ${token}`,
            },
          }
        );

      if (response.status === 401) {
        localStorage.removeItem(
          "access_token"
        );

        localStorage.removeItem(
          "user"
        );

        window.location.href =
          "/login";

        return;
      }

      if (!response.ok) {
        throw new Error(
          "Failed to load bookings."
        );
      }

      const data: BookingsResponse =
        await response.json();

      setBookings(
        Array.isArray(data.items)
          ? data.items
          : []
      );

      setTotal(
        Number(data.total) || 0
      );

      setPages(
        Number(data.pages) || 1
      );
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : "Failed to load bookings."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchBookings();
  }, [
    page,
    statusFilter,
    bookingDate,
  ]);

  const statusOptions =
    useMemo(() => {
      const values =
        bookings
          .map(
            (booking) =>
              booking.status?.trim()
          )
          .filter(Boolean);

      return Array.from(
        new Set(values)
      );
    }, [bookings]);

  const pendingCount =
    bookings.filter((booking) =>
      booking.status
        .toLowerCase()
        .includes("pending")
    ).length;

  const confirmedCount =
    bookings.filter((booking) => {
      const status =
        booking.status.toLowerCase();

      return (
        status.includes("confirm") ||
        status.includes("complete")
      );
    }).length;

  return (
    <>
      <NavbarAdmin />

      <main className={styles.page}>
        <div className={styles.container}>

          {/* =================================================
              HEADER
          ================================================= */}

          <section className={styles.hero}>
            <div className={styles.heroContent}>
              <span className={styles.eyebrow}>
                Booking Management
              </span>

              <h1 className={styles.heading}>
                Customer bookings
              </h1>

              <p className={styles.subtitle}>
                View scheduled customer sessions,
                payment information and booking
                status.
              </p>
            </div>

            <div className={styles.heroStats}>
              <div className={styles.statBox}>
                <div className={styles.statIcon}>
                  <CalendarDays size={21} />
                </div>

                <div>
                  <strong>{total}</strong>

                  <span>
                    Total bookings
                  </span>
                </div>
              </div>

              <div
                className={`${styles.smallStat} ${styles.pendingStat}`}
              >
                <strong>
                  {pendingCount}
                </strong>

                <span>
                  Pending
                </span>
              </div>

              <div
                className={`${styles.smallStat} ${styles.confirmedStat}`}
              >
                <strong>
                  {confirmedCount}
                </strong>

                <span>
                  Confirmed
                </span>
              </div>
            </div>
          </section>

          {/* =================================================
              MAIN CARD
          ================================================= */}

          <section className={styles.bookingCard}>
            <div className={styles.cardHeader}>
              <div>
                <div className={styles.titleRow}>
                  <h2>
                    All bookings
                  </h2>

                  <span
                    className={
                      styles.countBadge
                    }
                  >
                    {bookings.length} shown
                  </span>
                </div>

                <p>
                  Customer appointments currently
                  recorded in the system.
                </p>
              </div>

              <div
                className={
                  styles.controls
                }
              >
                <select
                  value={statusFilter}
                  onChange={(event) => {
                    setPage(1);

                    setStatusFilter(
                      event.target.value
                    );
                  }}
                  className={
                    styles.filter
                  }
                  aria-label="Filter bookings by status"
                >
                  <option value="">
                    All statuses
                  </option>

                  {statusOptions.map(
                    (status) => (
                      <option
                        key={status}
                        value={status}
                      >
                        {formatStatus(
                          status
                        )}
                      </option>
                    )
                  )}
                </select>

                <input
                  type="date"
                  value={bookingDate}
                  onChange={(event) => {
                    setPage(1);

                    setBookingDate(
                      event.target.value
                    );
                  }}
                  className={
                    styles.dateFilter
                  }
                  aria-label="Filter by booking date"
                />

                <button
                  type="button"
                  className={
                    styles.refreshButton
                  }
                  onClick={() =>
                    fetchBookings(
                      true
                    )
                  }
                  disabled={refreshing}
                  aria-label="Refresh bookings"
                >
                  <RefreshCw
                    size={16}
                    className={
                      refreshing
                        ? styles.spinning
                        : ""
                    }
                  />
                </button>
              </div>
            </div>

            {error && (
              <div
                className={
                  styles.error
                }
              >
                <span>{error}</span>

                <button
                  type="button"
                  onClick={() =>
                    fetchBookings()
                  }
                >
                  Retry
                </button>
              </div>
            )}

            {loading ? (
              <div
                className={
                  styles.loadingList
                }
              >
                {Array.from({
                  length: 5,
                }).map((_, index) => (
                  <div
                    key={index}
                    className={
                      styles.skeleton
                    }
                  />
                ))}
              </div>
            ) : bookings.length ===
              0 ? (
              <div className={styles.empty}>
                <div
                  className={
                    styles.emptyIcon
                  }
                >
                  <CalendarDays
                    size={27}
                  />
                </div>

                <h3>
                  No bookings found
                </h3>

                <p>
                  There are no bookings matching
                  the current filters.
                </p>
              </div>
            ) : (
              <div className={styles.list}>
                {bookings.map(
                  (booking) => (
                    <Link
                      key={booking.id}
                      href={`/admin/Bookings/${booking.id}`}
                      className={
                        styles.item
                      }
                    >
                      {/* CUSTOMER */}

                      <div
                        className={
                          styles.customerIcon
                        }
                      >
                        <UserRound
                          size={20}
                        />
                      </div>

                      <div
                        className={
                          styles.info
                        }
                      >
                        <span
                          className={
                            styles.itemLabel
                          }
                        >
                          Session
                        </span>

                        <h3
                          className={
                            styles.customerName
                          }
                        >
                          {
                            booking.session_type_name
                          }
                        </h3>

                        <span
                          className={
                            styles.bookingType
                          }
                        >
                          Booking #{booking.id.slice(
                            0,
                            8
                          )}
                        </span>
                      </div>

                      {/* DATE */}

                      <div
                        className={
                          styles.meta
                        }
                      >
                        <CalendarDays
                          size={15}
                        />

                        <div>
                          <span>
                            Date
                          </span>

                          <strong>
                            {formatDate(
                              booking.slot_starts_at
                            )}
                          </strong>
                        </div>
                      </div>

                      {/* TIME */}

                      <div
                        className={
                          styles.meta
                        }
                      >
                        <Clock3
                          size={15}
                        />

                        <div>
                          <span>
                            Time
                          </span>

                          <strong>
                            {formatTime(
                              booking.slot_starts_at
                            )}
                            {" – "}
                            {formatTime(
                              booking.slot_ends_at
                            )}
                          </strong>
                        </div>
                      </div>

                      {/* TOTAL */}

                      <div
                        className={
                          styles.totalMeta
                        }
                      >
                        <span>
                          Total
                        </span>

                        <strong>
                          {formatMoney(
                            booking.total_price_ghs
                          )}
                        </strong>
                      </div>

                      {/* STATUS */}

                      <div
                        className={
                          styles.statusArea
                        }
                      >
                        <span
                          className={`${styles.status} ${
                            getStatusClass(
                              booking.status
                            )
                          }`}
                        >
                          <CheckCircle2
                            size={12}
                          />

                          {formatStatus(
                            booking.status
                          )}
                        </span>
                      </div>

                      {/* ARROW */}

                      <div
                        className={
                          styles.arrow
                        }
                      >
                        <ArrowRight
                          size={19}
                        />
                      </div>
                    </Link>
                  )
                )}
              </div>
            )}

            {/* PAGINATION */}

            {!loading &&
              pages > 1 && (
                <div
                  className={
                    styles.pagination
                  }
                >
                  <button
                    type="button"
                    className={
                      styles.pageButton
                    }
                    disabled={
                      page <= 1
                    }
                    onClick={() =>
                      setPage(
                        (current) =>
                          Math.max(
                            1,
                            current - 1
                          )
                      )
                    }
                  >
                    <ChevronLeft
                      size={16}
                    />
                    Previous
                  </button>

                  <span
                    className={
                      styles.pageInfo
                    }
                  >
                    Page {page} of{" "}
                    {pages}
                  </span>

                  <button
                    type="button"
                    className={
                      styles.pageButton
                    }
                    disabled={
                      page >= pages
                    }
                    onClick={() =>
                      setPage(
                        (current) =>
                          Math.min(
                            pages,
                            current + 1
                          )
                      )
                    }
                  >
                    Next
                    <ChevronRight
                      size={16}
                    />
                  </button>
                </div>
              )}
          </section>
        </div>
      </main>

      <Footer />
    </>
  );
}