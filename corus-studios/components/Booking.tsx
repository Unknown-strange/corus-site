"use client";

import { useState, useRef, useEffect } from "react";
import Image from "next/image";
import api from "@/lib/api";
import type { SessionType, Slot } from "@/lib/types";
import styles from "./Booking.module.css";

const WEEKDAYS = [
  "Su",
  "Mo",
  "Tu",
  "We",
  "Th",
  "Fr",
  "Sa",
];

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

type Cell = {
  key: string;
  day: number;
  outside: boolean;
  past: boolean;
  iso: string;
};

function toIso(
  year: number,
  month: number,
  day: number
) {
  return `${year}-${String(month + 1).padStart(
    2,
    "0"
  )}-${String(day).padStart(2, "0")}`;
}

function buildWeeks(
  year: number,
  month: number,
  todayIso: string
): Cell[][] {
  const firstWeekday = new Date(
    year,
    month,
    1
  ).getDay();

  const daysInMonth = new Date(
    year,
    month + 1,
    0
  ).getDate();

  const weeks: Cell[][] = [];

  let week: Cell[] = [];

  const push = (
    y: number,
    m: number,
    d: number,
    outside: boolean
  ) => {
    const iso = toIso(y, m, d);

    week.push({
      key: `${iso}-${outside}`,
      day: d,
      outside,
      past: iso < todayIso,
      iso,
    });

    if (week.length === 7) {
      weeks.push(week);
      week = [];
    }
  };

  const prevMonthDays = new Date(
    year,
    month,
    0
  ).getDate();

  for (
    let i = firstWeekday - 1;
    i >= 0;
    i -= 1
  ) {
    const d = prevMonthDays - i;
    const m = month === 0 ? 11 : month - 1;

    push(
      month === 0 ? year - 1 : year,
      m,
      d,
      true
    );
  }

  for (
    let d = 1;
    d <= daysInMonth;
    d += 1
  ) {
    push(year, month, d, false);
  }

  let d = 1;

  while (week.length > 0) {
    const m = month === 11 ? 0 : month + 1;

    push(
      month === 11 ? year + 1 : year,
      m,
      d,
      true
    );

    d += 1;
  }

  return weeks;
}

export default function Booking({
  todayIso,
}: {
  todayIso: string;
}) {
  const sectionRef =
    useRef<HTMLElement>(null);

  /*
   * IMPORTANT:
   * This prevents the server render and the first
   * client render from producing different
   * disabled attributes.
   */
  const [mounted, setMounted] =
    useState(false);

  const [isVisible, setIsVisible] =
    useState(false);

  /* =========================================================
     CALENDAR
  ========================================================= */

  const [
    viewOverride,
    setViewOverride,
  ] = useState<{
    year: number;
    month: number;
  } | null>(null);

  const [
    selectedDate,
    setSelectedDate,
  ] = useState<string | null>(null);

  const view = viewOverride ?? {
    year: Number(
      todayIso.slice(0, 4)
    ),
    month:
      Number(
        todayIso.slice(5, 7)
      ) - 1,
  };

  /* =========================================================
     SESSION TYPES / PACKAGES
  ========================================================= */

  const [
    sessionTypes,
    setSessionTypes,
  ] = useState<SessionType[]>([]);

  const [
    loadingPackages,
    setLoadingPackages,
  ] = useState(true);

  const [
    sessionTypeError,
    setSessionTypeError,
  ] = useState<string | null>(
    null
  );

  const [
    selectedPackageId,
    setSelectedPackageId,
  ] = useState<string | null>(null);

  /* =========================================================
     AVAILABLE SLOTS
  ========================================================= */

  const [
    availableSlots,
    setAvailableSlots,
  ] = useState<Slot[]>([]);

  const [
    loadingSlots,
    setLoadingSlots,
  ] = useState(false);

  const [
    selectedSlotId,
    setSelectedSlotId,
  ] = useState<string | null>(null);

  /* =========================================================
     SUBMISSION
  ========================================================= */

  const [
    loading,
    setLoading,
  ] = useState(false);

  const [
    notice,
    setNotice,
  ] = useState("");

  const [
    success,
    setSuccess,
  ] = useState(false);

  /* =========================================================
     MOUNT
  ========================================================= */

  useEffect(() => {
    setMounted(true);
  }, []);

  /* =========================================================
     LOAD SESSION TYPES
  ========================================================= */

  useEffect(() => {
    let cancelled = false;

    const fetchSessionTypes =
      async () => {
        try {
          setLoadingPackages(true);
          setSessionTypeError(null);

          const response =
            await api.sessions.types();

          if (!response.ok) {
            const errorData =
              await response
                .json()
                .catch(() => null);

            console.error(
              "SESSION TYPES FAILED",
              {
                status:
                  response.status,
                statusText:
                  response.statusText,
                response:
                  errorData,
              }
            );

            throw new Error(
              "Failed to load booking packages."
            );
          }

          const data =
            (await response.json()) as SessionType[];

          if (cancelled) return;

          setSessionTypes(data);

          if (data.length > 0) {
            setSelectedPackageId(
              data[0].id
            );
          } else {
            setSelectedPackageId(null);
          }
        } catch (error) {
          console.error(
            "Failed to load session types:",
            error
          );

          if (!cancelled) {
            setSessionTypes([]);
            setSelectedPackageId(null);

            setSessionTypeError(
              error instanceof Error
                ? error.message
                : "Could not load booking packages."
            );
          }
        } finally {
          if (!cancelled) {
            setLoadingPackages(false);
          }
        }
      };

    fetchSessionTypes();

    return () => {
      cancelled = true;
    };
  }, []);

  /* =========================================================
     LOAD AVAILABILITY WHEN DATE CHANGES
  ========================================================= */

  useEffect(() => {
    if (!selectedDate) {
      setAvailableSlots([]);
      setSelectedSlotId(null);
      return;
    }

    let cancelled = false;

    const fetchAvailability =
      async () => {
        try {
          setLoadingSlots(true);
          setNotice("");
          setSuccess(false);
          setSelectedSlotId(null);

          const start =
            `${selectedDate}T00:00:00`;

          const end =
            `${selectedDate}T23:59:59`;

          console.log(
            "Fetching availability:",
            {
              start,
              end,
            }
          );

          const response =
            await api.sessions.availability(
              start,
              end
            );

          if (!response.ok) {
            const errorData =
              await response
                .json()
                .catch(() => null);

            console.error(
              "AVAILABILITY FAILED",
              {
                status:
                  response.status,
                statusText:
                  response.statusText,
                response:
                  errorData,
                start,
                end,
              }
            );

            throw new Error(
              "Failed to load available times."
            );
          }

          const data =
            (await response.json()) as Slot[];

          if (cancelled) return;

          console.log(
            "Availability response:",
            data
          );

          setAvailableSlots(data);

          if (data.length > 0) {
            setSelectedSlotId(
              data[0].id
            );
          } else {
            setSelectedSlotId(null);
          }
        } catch (error) {
          console.error(
            "Failed to load availability:",
            error
          );

          if (!cancelled) {
            setAvailableSlots([]);
            setSelectedSlotId(null);

            setNotice(
              error instanceof Error
                ? error.message
                : "Could not load available times."
            );

            setSuccess(false);
          }
        } finally {
          if (!cancelled) {
            setLoadingSlots(false);
          }
        }
      };

    fetchAvailability();

    return () => {
      cancelled = true;
    };
  }, [selectedDate]);

  /* =========================================================
     SECTION ANIMATION
  ========================================================= */

  useEffect(() => {
    const observer =
      new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            setIsVisible(true);

            observer.unobserve(
              entry.target
            );
          }
        },
        {
          threshold: 0.2,
        }
      );

    if (sectionRef.current) {
      observer.observe(
        sectionRef.current
      );
    }

    return () => {
      if (sectionRef.current) {
        observer.unobserve(
          sectionRef.current
        );
      }
    };
  }, []);

  /* =========================================================
     FORMAT PRICE
  ========================================================= */

  const formatPrice = (
    price: string
  ) => {
    const parsed =
      Number(price);

    if (
      !Number.isFinite(parsed)
    ) {
      return `GH₵${price}`;
    }

    return `GH₵${parsed.toLocaleString(
      "en-GH",
      {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }
    )}`;
  };

  /* =========================================================
     SUBMIT BOOKING
  ========================================================= */

const handleSubmit =
  async (
    event: React.FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    setNotice("");
    setSuccess(false);

    const token =
      localStorage.getItem(
        "access_token"
      );

    if (!token) {
      setNotice(
        "Please log in to book a session."
      );
      return;
    }

    if (!selectedPackageId) {
      setNotice(
        "Please select a package."
      );
      return;
    }

    if (!selectedDate) {
      setNotice(
        "Please select a date."
      );
      return;
    }

    if (!selectedSlotId) {
      setNotice(
        "Please select an available time."
      );
      return;
    }

    setLoading(true);

    try {
      /* =============================================
         STEP 1 — CREATE HOLD
      ============================================= */

      console.log(
        "Creating booking hold:",
        {
          slot_id:
            selectedSlotId,
          session_type_id:
            selectedPackageId,
        }
      );

      const holdResponse =
        await api.sessions.createHold(
          {
            slot_id:
              selectedSlotId,
            session_type_id:
              selectedPackageId,
          },
          token
        );

      const holdData =
        await holdResponse
          .json()
          .catch(() => null);

      if (!holdResponse.ok) {
        console.error(
          "BOOKING HOLD FAILED",
          {
            status:
              holdResponse.status,
            response:
              holdData,
          }
        );

        let message =
          `Failed to create booking hold (${holdResponse.status}).`;

        if (
          holdData?.detail
        ) {
          if (
            Array.isArray(
              holdData.detail
            )
          ) {
            message =
              holdData.detail
                .map(
                  (item: {
                    msg?: string;
                  }) =>
                    item.msg ||
                    "Validation error"
                )
                .join(
                  ", "
                );
          } else if (
            typeof holdData.detail ===
            "string"
          ) {
            message =
              holdData.detail;
          }
        } else if (
          typeof holdData?.message ===
          "string"
        ) {
          message =
            holdData.message;
        } else if (
          typeof holdData?.error
            ?.message ===
          "string"
        ) {
          message =
            holdData.error.message;
        }

        throw new Error(
          message
        );
      }

      const holdId =
        holdData?.id ??
        holdData?.hold_id;

      if (!holdId) {
        console.error(
          "BOOKING HOLD RESPONSE:",
          holdData
        );

        throw new Error(
          "The booking hold was created but no hold ID was returned."
        );
      }

      console.log(
        "Booking hold created:",
        holdId
      );

      /* =============================================
         STEP 2 — SAVE BOOKING CHECKOUT CONTEXT

         The actual Paystack checkout is now done
         from the common /checkout page.
      ============================================= */

      const selectedSession =
        sessionTypes.find(
          (session) =>
            session.id ===
            selectedPackageId
        );

      const selectedSlot =
        availableSlots.find(
          (slot) =>
            slot.id ===
            selectedSlotId
        );

      const bookingCheckout = {
        hold_id: holdId,

        session_type_id:
          selectedPackageId,

        session_type_name:
          selectedSession?.name ||
          "Session",

        session_description:
          selectedSession?.description ||
          "",

        price_ghs:
          selectedSession?.price_ghs ||
          "0",

        slot_id:
          selectedSlotId,

        slot_starts_at:
          selectedSlot?.starts_at ||
          `${selectedDate}T00:00:00`,

        slot_ends_at:
          selectedSlot?.ends_at ||
          `${selectedDate}T00:00:00`,
      };

      sessionStorage.setItem(
        "booking_checkout",
        JSON.stringify(
          bookingCheckout
        )
      );

      /* =============================================
         STEP 3 — GO TO COMMON CHECKOUT PAGE
      ============================================= */

      window.location.href =
        "/checkout";
    } catch (error) {
      console.error(
        "BOOKING SUBMISSION FAILED:",
        error
      );

      setSuccess(false);

      setNotice(
        error instanceof Error
          ? error.message
          : "Unable to complete your booking."
      );
    } finally {
      setLoading(false);
    }
  };

  /* =========================================================
     CALENDAR
  ========================================================= */

  const weeks =
    buildWeeks(
      view.year,
      view.month,
      todayIso
    );

  const baseYear =
    Number(
      todayIso.slice(0, 4)
    );

  const years = [
    baseYear,
    baseYear + 1,
    baseYear + 2,
  ];

  /* =========================================================
     TIME OPTIONS
  ========================================================= */

  const timeOptions =
    availableSlots.map(
      (slot) => {
        const start =
          new Date(
            slot.starts_at
          );

        const end =
          new Date(
            slot.ends_at
          );

        return {
          id: slot.id,

          label: `${start.toLocaleTimeString(
            "en-US",
            {
              hour: "2-digit",
              minute: "2-digit",
            }
          )} - ${end.toLocaleTimeString(
            "en-US",
            {
              hour: "2-digit",
              minute: "2-digit",
            }
          )}`,
        };
      }
    );

  /* =========================================================
     DISABLED STATES
     
     During SSR and the very first client render,
     `mounted` is false. This keeps the HTML identical.
  ========================================================= */

  const packageSelectDisabled =
    mounted
      ? loadingPackages
      : false;

  const timeSelectDisabled =
    mounted
      ? (
          !selectedDate ||
          loadingSlots ||
          availableSlots.length === 0
        )
      : false;

  const submitDisabled =
    mounted
      ? (
          loading ||
          loadingPackages ||
          !selectedPackageId ||
          !selectedSlotId
        )
      : false;

  /* =========================================================
     RENDER
  ========================================================= */

  return (
    <section
      ref={sectionRef}
      className={`${
        styles.bookingSection
      } ${
        isVisible
          ? styles.visible
          : ""
      }`}
    >
      {/* LEFT DECORATIVE IMAGE */}

      <div
        className={`${
          styles.imageLeft
        } ${
          isVisible
            ? styles.imageVisible
            : ""
        }`}
      >
        <Image
          src="/images/booking-left.png"
          alt=""
          fill
          sizes="250px"
          className={
            styles.image
          }
        />
      </div>

      {/* RIGHT DECORATIVE IMAGE */}

      <div
        className={`${
          styles.imageRight
        } ${
          isVisible
            ? styles.imageVisible
            : ""
        }`}
      >
        <Image
          src="/images/booking-right.png"
          alt=""
          fill
          sizes="350px"
          className={
            styles.image
          }
        />
      </div>

      <h2>
        Book a Session Today
      </h2>

      <form
        className={
          styles.form
        }
        onSubmit={
          handleSubmit
        }
      >
        {/* FULL NAME */}

        <input
          type="text"
          placeholder="Full Name"
          required
        />

        <div
          className={
            styles.row
          }
        >
          {/* PHONE */}

          <div
            className={
              styles.phoneGroup
            }
          >
            <span>
              +233
            </span>

            <input
              type="tel"
              placeholder="Phone Number"
              required
            />
          </div>

          {/* KIND OF PHOTOSHOOT */}

          <select
            required
            value={
              selectedPackageId ??
              ""
            }
            onChange={(event) =>
              setSelectedPackageId(
                event.target.value
              )
            }
            disabled={
              packageSelectDisabled
            }
          >
            <option
              value=""
              disabled
              hidden
            >
              {loadingPackages
                ? "Loading..."
                : "Kind of Photoshoot"}
            </option>

            {sessionTypes.map(
              (session) => (
                <option
                  key={
                    session.id
                  }
                  value={
                    session.id
                  }
                >
                  {session.name}
                </option>
              )
            )}
          </select>
        </div>

        {/* CALENDAR */}

        <div
          className={
            styles.calendar
          }
          role="group"
          aria-labelledby="date-legend"
        >
          <div
            className={
              styles.calendarHead
            }
          >
            <select
              className={
                styles.select
              }
              aria-label="Month"
              value={
                view.month
              }
              onChange={(event) =>
                setViewOverride({
                  year:
                    view.year,
                  month:
                    Number(
                      event.target
                        .value
                    ),
                })
              }
            >
              {MONTHS.map(
                (
                  name,
                  index
                ) => (
                  <option
                    key={
                      name
                    }
                    value={
                      index
                    }
                  >
                    {name}
                  </option>
                )
              )}
            </select>

            <select
              className={
                styles.select
              }
              aria-label="Year"
              value={
                view.year
              }
              onChange={(event) =>
                setViewOverride({
                  year:
                    Number(
                      event.target
                        .value
                    ),
                  month:
                    view.month,
                })
              }
            >
              {years.map(
                (year) => (
                  <option
                    key={
                      year
                    }
                    value={
                      year
                    }
                  >
                    {year}
                  </option>
                )
              )}
            </select>
          </div>

          <div
            className={
              styles.weekdays
            }
          >
            {WEEKDAYS.map(
              (day) => (
                <div
                  key={day}
                  className={
                    styles.weekday
                  }
                >
                  {day}
                </div>
              )
            )}
          </div>

          {weeks.map(
            (
              week,
              index
            ) => (
              <div
                key={
                  index
                }
                className={
                  styles.week
                }
              >
                {week.map(
                  (cell) => (
                    <button
                      key={
                        cell.key
                      }
                      type="button"
                      className={`${
                        styles.day
                      } ${
                        cell.outside
                          ? styles.dayOutside
                          : ""
                      } ${
                        selectedDate ===
                        cell.iso
                          ? styles.daySelected
                          : ""
                      }`}
                      disabled={
                        cell.past
                      }
                      aria-pressed={
                        selectedDate ===
                        cell.iso
                      }
                      onClick={() =>
                        setSelectedDate(
                          cell.iso
                        )
                      }
                    >
                      {
                        cell.day
                      }
                    </button>
                  )
                )}
              </div>
            )
          )}
        </div>

        {/* AVAILABLE TIME */}

        <select
          required
          value={
            selectedSlotId ??
            ""
          }
          onChange={(event) =>
            setSelectedSlotId(
              event.target.value
            )
          }
          disabled={
            timeSelectDisabled
          }
        >
          <option
            value=""
            disabled
          >
            {!selectedDate
              ? "Choose a date first"
              : loadingSlots
              ? "Loading available times..."
              : availableSlots.length ===
                0
              ? "No slots available"
              : "Choose booking time"}
          </option>

          {timeOptions.map(
            (option) => (
              <option
                key={
                  option.id
                }
                value={
                  option.id
                }
              >
                {
                  option.label
                }
              </option>
            )
          )}
        </select>

        {/* PACKAGES */}

        {loadingPackages ? (
          <div>
            Loading packages...
          </div>
        ) : (
          <div
            className={
              styles.packageContainer
            }
          >
            {sessionTypes.map(
              (session) => (
                <div
                  key={
                    session.id
                  }
                  onClick={() =>
                    setSelectedPackageId(
                      session.id
                    )
                  }
                  className={`${
                    styles.packageCard
                  } ${
                    selectedPackageId ===
                    session.id
                      ? styles.active
                      : ""
                  }`}
                >
                  <h3>
                    {formatPrice(
                      session.price_ghs
                    )}
                  </h3>

                  <p>
                    {
                      session.description
                    }
                  </p>
                </div>
              )
            )}
          </div>
        )}

        {/* SESSION TYPE ERROR */}

        {sessionTypeError && (
          <div
            className={
              styles.notice
            }
          >
            {sessionTypeError}
          </div>
        )}

        {/* GENERAL NOTICE */}

        {notice && (
          <div
            className={
              success
                ? styles.success
                : styles.notice
            }
          >
            {notice}
          </div>
        )}

        {/* SUBMIT */}

        <button
          className={
            styles.submit
          }
          type="submit"
          disabled={
            submitDisabled
          }
        >
          {loading
            ? "Processing..."
            : "Book"}
        </button>
      </form>
    </section>
  );
}