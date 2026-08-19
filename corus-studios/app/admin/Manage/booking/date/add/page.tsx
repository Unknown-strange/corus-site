"use client";

import {
  useState,
} from "react";

import {
  useRouter,
} from "next/navigation";

import {
  ArrowLeft,
  CalendarPlus,
  Clock3,
  Save,
} from "lucide-react";

import NavbarAdmin from "@/components/NavbarAdmin";
import Footer from "@/components/Footer";

import styles from "./page.module.css";

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:8000";

function buildISODateTime(
  date: string,
  time: string
) {
  if (!date || !time) {
    return "";
  }

  /*
   * Interpret the selected date/time as a local
   * browser date and convert it to ISO.
   */

  const localDate =
    new Date(
      `${date}T${time}:00`
    );

  return localDate.toISOString();
}

export default function AddUnavailableDatePage() {
  const router = useRouter();

  const [date, setDate] =
    useState("");

  const [startTime, setStartTime] =
    useState("");

  const [endTime, setEndTime] =
    useState("");

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState<string | null>(null);

  const goBack = () => {
    router.push(
      "/admin/Manage/booking/date"
    );
  };

  const handleSubmit = async (
    event: React.FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    setError(null);

    if (
      !date ||
      !startTime ||
      !endTime
    ) {
      setError(
        "Please select a date, start time and end time."
      );

      return;
    }

    const start =
      buildISODateTime(
        date,
        startTime
      );

    const end =
      buildISODateTime(
        date,
        endTime
      );

    if (
      !start ||
      !end
    ) {
      setError(
        "Invalid date or time."
      );

      return;
    }

    if (
      new Date(end) <=
      new Date(start)
    ) {
      setError(
        "End time must be later than start time."
      );

      return;
    }

    try {
      setLoading(true);

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
          `${API_BASE}/admin/studio-slots`,
          {
            method: "POST",
            headers: {
              Authorization:
                `Bearer ${token}`,
              "Content-Type":
                "application/json",
            },
            body: JSON.stringify({
              starts_at:
                start,
              ends_at:
                end,
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
            "Failed to create studio slot."
        );
      }

      router.push(
        "/admin/Manage/booking/date"
      );
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : "Failed to save studio slot."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <NavbarAdmin />

      <main className={styles.page}>
        <div
          className={styles.container}
        >
          <section
            className={
              styles.pageHeader
            }
          >
            <button
              type="button"
              className={
                styles.backButton
              }
              onClick={goBack}
            >
              <ArrowLeft size={20} />
            </button>

            <div>
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
                Add studio slot
              </h1>

              <p
                className={
                  styles.subtitle
                }
              >
                Create a time slot that can
                later be opened or blocked.
              </p>
            </div>
          </section>

          <section
            className={
              styles.formCard
            }
          >
            <div
              className={
                styles.cardHeader
              }
            >
              <div
                className={
                  styles.cardIcon
                }
              >
                <CalendarPlus
                  size={21}
                />
              </div>

              <div>
                <h2>
                  Slot Details
                </h2>

                <p>
                  Select the date and
                  available time period.
                </p>
              </div>
            </div>

            {error && (
              <div
                className={
                  styles.error
                }
              >
                {error}
              </div>
            )}

            <form
              className={styles.form}
              onSubmit={
                handleSubmit
              }
            >
              <div
                className={
                  styles.fieldGroup
                }
              >
                <label
                  htmlFor="date"
                  className={styles.label}
                >
                  Date
                </label>

                <input
                  id="date"
                  type="date"
                  value={date}
                  onChange={(event) =>
                    setDate(
                      event.target.value
                    )
                  }
                  className={
                    styles.input
                  }
                  required
                />
              </div>

              <div
                className={
                  styles.timeGrid
                }
              >
                <div
                  className={
                    styles.fieldGroup
                  }
                >
                  <label
                    htmlFor="start-time"
                    className={styles.label}
                  >
                    Start Time
                  </label>

                  <div
                    className={
                      styles.inputIconWrapper
                    }
                  >
                    <Clock3
                      size={17}
                    />

                    <input
                      id="start-time"
                      type="time"
                      value={
                        startTime
                      }
                      onChange={(
                        event
                      ) =>
                        setStartTime(
                          event.target
                            .value
                        )
                      }
                      className={
                        styles.timeInput
                      }
                      required
                    />
                  </div>

                  <span
                    className={
                      styles.hint
                    }
                  >
                    24-hour format
                  </span>
                </div>

                <div
                  className={
                    styles.fieldGroup
                  }
                >
                  <label
                    htmlFor="end-time"
                    className={styles.label}
                  >
                    End Time
                  </label>

                  <div
                    className={
                      styles.inputIconWrapper
                    }
                  >
                    <Clock3
                      size={17}
                    />

                    <input
                      id="end-time"
                      type="time"
                      value={
                        endTime
                      }
                      onChange={(
                        event
                      ) =>
                        setEndTime(
                          event.target
                            .value
                        )
                      }
                      className={
                        styles.timeInput
                      }
                      required
                    />
                  </div>

                  <span
                    className={
                      styles.hint
                    }
                  >
                    24-hour format
                  </span>
                </div>
              </div>

              <div
                className={
                  styles.formActions
                }
              >
                <button
                  type="button"
                  className={
                    styles.cancelButton
                  }
                  onClick={
                    goBack
                  }
                  disabled={
                    loading
                  }
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className={
                    styles.saveButton
                  }
                  disabled={
                    loading
                  }
                >
                  <Save size={17} />

                  {loading
                    ? "Saving..."
                    : "Create Slot"}
                </button>
              </div>
            </form>
          </section>
        </div>
      </main>

      <Footer />
    </>
  );
}