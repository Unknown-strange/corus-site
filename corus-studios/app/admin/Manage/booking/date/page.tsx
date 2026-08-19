"use client";

import {
  useEffect,
  useState,
} from "react";

import Link from "next/link";

import {
  Plus,
  Trash2,
  CalendarDays,
  Clock3,
  ArrowLeft,
  RefreshCw,
  Ban,
  CheckCircle2,
} from "lucide-react";

import {
  useRouter,
} from "next/navigation";

import NavbarAdmin from "@/components/NavbarAdmin";
import Footer from "@/components/Footer";

import styles from "./page.module.css";

type StudioSlot = {
  id: string;
  starts_at: string;
  ends_at: string;
  is_blocked: boolean;
  created_by_id: string;
  created_at: string;
};

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:8000";

function formatDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString(
    "en-GB",
    {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }
  );
}

function formatTime(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleTimeString(
    "en-GH",
    {
      hour: "numeric",
      minute: "2-digit",
    }
  );
}

export default function UnavailableDatesAdmin() {
  const router = useRouter();

  const [slots, setSlots] =
    useState<StudioSlot[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [error, setError] =
    useState<string | null>(null);

  const goBack = () => {
    router.push(
      "/admin/Manage/booking"
    );
  };

  const fetchSlots = async (
    refresh = false
  ) => {
    try {
      if (refresh) {
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
        window.location.href =
          "/login";
        return;
      }

      /*
       * No date filter means:
       * load the studio slots returned
       * by the backend.
       */

      const response =
        await fetch(
          `${API_BASE}/admin/studio-slots`,
          {
            headers: {
              Authorization:
                `Bearer ${token}`,
              Accept:
                "application/json",
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
        const body =
          await response
            .json()
            .catch(() => null);

        throw new Error(
          body?.detail ||
            "Failed to load studio slots."
        );
      }

      const data =
        await response.json();

      setSlots(
        Array.isArray(data)
          ? data
          : []
      );
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : "Failed to load studio slots."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchSlots();
  }, []);

  const handleToggleBlock =
    async (
      slot: StudioSlot
    ) => {
      try {
        const token =
          localStorage.getItem(
            "access_token"
          );

        if (!token) {
          window.location.href =
            "/login";
          return;
        }

        const response =
          await fetch(
            `${API_BASE}/admin/studio-slots/${slot.id}/block`,
            {
              method: "PATCH",
              headers: {
                Authorization:
                  `Bearer ${token}`,
                "Content-Type":
                  "application/json",
              },
              body: JSON.stringify({
                is_blocked:
                  !slot.is_blocked,
              }),
            }
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

          window.location.href =
            "/login";

          return;
        }

        if (!response.ok) {
          const body =
            await response
              .json()
              .catch(() => null);

          throw new Error(
            body?.detail ||
              "Failed to update slot."
          );
        }

        const updated =
          await response.json();

        setSlots(
          (current) =>
            current.map(
              (item) =>
                item.id ===
                slot.id
                  ? updated
                  : item
            )
        );
      } catch (err) {
        console.error(err);

        setError(
          err instanceof Error
            ? err.message
            : "Failed to update slot."
        );
      }
    };

  const blockedCount =
    slots.filter(
      (slot) =>
        slot.is_blocked
    ).length;

  const availableCount =
    slots.length -
    blockedCount;

  return (
    <>
      <NavbarAdmin />

      <main className={styles.page}>
        <div
          className={styles.container}
        >

          {/* HEADER */}

          <section
            className={styles.hero}
          >
            <div
              className={
                styles.heroContent
              }
            >
              <button
                type="button"
                className={
                  styles.backButton
                }
                onClick={goBack}
              >
                <ArrowLeft
                  size={19}
                />
              </button>

              <span
                className={
                  styles.eyebrow
                }
              >
                Booking Management
              </span>

              <h1
                className={
                  styles.heading
                }
              >
                Studio availability
              </h1>

              <p
                className={
                  styles.subtitle
                }
              >
                Manage the time slots that
                customers can and cannot book.
              </p>
            </div>

            <div
              className={
                styles.heroActions
              }
            >
              <div
                className={
                  styles.statBox
                }
              >
                <div
                  className={
                    styles.statIcon
                  }
                >
                  <CalendarDays
                    size={20}
                  />
                </div>

                <div>
                  <strong>
                    {slots.length}
                  </strong>

                  <span>
                    Total slots
                  </span>
                </div>
              </div>

              <div
                className={
                  styles.blockedBox
                }
              >
                <Ban size={16} />

                <span>
                  {blockedCount} Blocked
                </span>
              </div>

              <div
                className={
                  styles.availableBox
                }
              >
                <CheckCircle2
                  size={16}
                />

                <span>
                  {availableCount} Open
                </span>
              </div>

              <button
                type="button"
                className={
                  styles.refreshButton
                }
                onClick={() =>
                  fetchSlots(true)
                }
                disabled={
                  refreshing
                }
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

              <Link
                href="/admin/Manage/booking/date/add"
                className={
                  styles.heroButton
                }
              >
                <Plus size={18} />
                Add Slot
              </Link>
            </div>
          </section>

          {error && (
            <div
              className={
                styles.error
              }
            >
              <span>
                {error}
              </span>

              <button
                type="button"
                onClick={() =>
                  fetchSlots()
                }
              >
                Retry
              </button>
            </div>
          )}

          {/* MAIN CARD */}

          <section
            className={
              styles.dateCard
            }
          >
            <div
              className={
                styles.cardHeader
              }
            >
              <div>
                <div
                  className={
                    styles.titleRow
                  }
                >
                  <h2>
                    Studio Slots
                  </h2>

                  <span
                    className={
                      styles.activeBadge
                    }
                  >
                    <CalendarDays
                      size={13}
                    />
                    {slots.length} Total
                  </span>
                </div>

                <p>
                  Block a slot when the studio
                  shouldn't accept bookings.
                </p>
              </div>

              <span
                className={styles.count}
              >
                {blockedCount} blocked
              </span>
            </div>

            {loading ? (
              <div
                className={
                  styles.loadingList
                }
              >
                {Array.from({
                  length: 4,
                }).map((_, index) => (
                  <div
                    key={index}
                    className={
                      styles.skeleton
                    }
                  />
                ))}
              </div>
            ) : slots.length ===
              0 ? (
              <div
                className={
                  styles.empty
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

                <h3>
                  No studio slots
                </h3>

                <p>
                  Create your first studio
                  slot to start managing
                  availability.
                </p>

                <Link
                  href="/admin/Manage/booking/date/add"
                  className={
                    styles.emptyButton
                  }
                >
                  <Plus size={17} />
                  Add Slot
                </Link>
              </div>
            ) : (
              <div
                className={styles.list}
              >
                {slots.map(
                  (slot) => (
                    <article
                      key={slot.id}
                      className={
                        styles.item
                      }
                    >
                      <div
                        className={
                          styles.dateIcon
                        }
                      >
                        <CalendarDays
                          size={21}
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
                          Studio Slot
                        </span>

                        <h3
                          className={
                            styles.date
                          }
                        >
                          {formatDate(
                            slot.starts_at
                          )}
                        </h3>
                      </div>

                      <div
                        className={
                          styles.timeBox
                        }
                      >
                        <Clock3 size={17} />

                        <span>
                          {formatTime(
                            slot.starts_at
                          )}
                          {" – "}
                          {formatTime(
                            slot.ends_at
                          )}
                        </span>
                      </div>

                      <span
                        className={`${styles.slotStatus} ${
                          slot.is_blocked
                            ? styles.slotBlocked
                            : styles.slotOpen
                        }`}
                      >
                        {slot.is_blocked
                          ? "Blocked"
                          : "Open"}
                      </span>

                      <button
                        type="button"
                        className={
                          slot.is_blocked
                            ? styles.unblockButton
                            : styles.deleteButton
                        }
                        onClick={() =>
                          handleToggleBlock(
                            slot
                          )
                        }
                      >
                        {slot.is_blocked ? (
                          <>
                            <CheckCircle2
                              size={17}
                            />
                            <span>
                              Unblock
                            </span>
                          </>
                        ) : (
                          <>
                            <Ban
                              size={17}
                            />
                            <span>
                              Block
                            </span>
                          </>
                        )}
                      </button>
                    </article>
                  )
                )}
              </div>
            )}

            {!loading &&
              slots.length > 0 && (
                <Link
                  href="/admin/Manage/booking/date/add"
                  className={
                    styles.addButton
                  }
                >
                  <Plus size={18} />
                  Add studio slot
                </Link>
              )}
          </section>
        </div>
      </main>

      <Footer />
    </>
  );
}