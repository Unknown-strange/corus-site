"use client";

import { useState } from "react";
import api from "@/lib/api";
import styles from "./StudioRequest.module.css";

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

const SLOTS = [
  {
    id: "10:00",
    label: "10am - 11am",
    disabled: false,
  },
  {
    id: "11:00",
    label: "11am - 12pm",
    disabled: false,
  },
  {
    id: "12:00",
    label: "12pm - 01pm",
    disabled: false,
  },
  {
    id: "14:00",
    label: "02pm - 03pm",
    disabled: false,
  },
  {
    id: "15:00",
    label: "03pm - 04pm",
    disabled: false,
  },
  {
    id: "16:00",
    label: "04pm - 05pm",
    disabled: false,
  },
  {
    id: "18:00",
    label: "06pm - 07pm",
    disabled: false,
  },
  {
    id: "19:00",
    label: "07pm - 08pm",
    disabled: false,
  },
  {
    id: "20:00",
    label: "08pm - 09pm",
    disabled: false,
  },
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
  return `${year}-${String(
    month + 1
  ).padStart(
    2,
    "0"
  )}-${String(
    day
  ).padStart(
    2,
    "0"
  )}`;
}

function buildWeeks(
  year: number,
  month: number,
  todayIso: string
): Cell[][] {
  const firstWeekday =
    new Date(
      year,
      month,
      1
    ).getDay();

  const daysInMonth =
    new Date(
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
    const iso = toIso(
      y,
      m,
      d
    );

    week.push({
      key: `${iso}-${outside}`,
      day: d,
      outside,
      past:
        iso < todayIso,
      iso,
    });

    if (
      week.length === 7
    ) {
      weeks.push(
        week
      );
      week = [];
    }
  };

  const prevMonthDays =
    new Date(
      year,
      month,
      0
    ).getDate();

  for (
    let i =
      firstWeekday - 1;
    i >= 0;
    i -= 1
  ) {
    const d =
      prevMonthDays -
      i;

    const m =
      month === 0
        ? 11
        : month - 1;

    push(
      month === 0
        ? year - 1
        : year,
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
    push(
      year,
      month,
      d,
      false
    );
  }

  let d = 1;

  while (
    week.length > 0
  ) {
    const m =
      month === 11
        ? 0
        : month + 1;

    push(
      month === 11
        ? year + 1
        : year,
      m,
      d,
      true
    );

    d += 1;
  }

  return weeks;
}

function getErrorMessage(
  data: unknown,
  fallback: string
): string {
  if (
    typeof data ===
      "string" &&
    data.trim()
  ) {
    return data;
  }

  if (
    data &&
    typeof data ===
      "object"
  ) {
    const response =
      data as {
        detail?: unknown;
        message?: unknown;
        error?: {
          message?: unknown;
        };
      };

    if (
      typeof response.detail ===
      "string"
    ) {
      return response.detail;
    }

    if (
      Array.isArray(
        response.detail
      )
    ) {
      const messages =
        response.detail
          .map(
            (item) => {
              if (
                item &&
                typeof item ===
                  "object" &&
                "msg" in
                  item &&
                typeof (
                  item as {
                    msg?: unknown;
                  }
                ).msg ===
                  "string"
              ) {
                return (
                  item as {
                    msg: string;
                  }
                ).msg;
              }

              return null;
            }
          )
          .filter(
            (
              value
            ): value is string =>
              Boolean(value)
          );

      if (
        messages.length
      ) {
        return messages.join(
          ", "
        );
      }
    }

    if (
      typeof response.message ===
      "string"
    ) {
      return response.message;
    }

    if (
      typeof response.error
        ?.message ===
      "string"
    ) {
      return response.error
        .message;
    }
  }

  return fallback;
}

export default function StudioRequest({
  todayIso,
}: {
  todayIso: string;
}) {
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
  ] =
    useState<string | null>(
      null
    );

  const [
    selectedSlots,
    setSelectedSlots,
  ] = useState<string[]>(
    []
  );

  const [
    notice,
    setNotice,
  ] = useState("");

  const [
    loading,
    setLoading,
  ] = useState(false);

  const [
    success,
    setSuccess,
  ] = useState(false);

  const view =
    viewOverride ?? {
      year: Number(
        todayIso.slice(
          0,
          4
        )
      ),
      month:
        Number(
          todayIso.slice(
            5,
            7
          )
        ) - 1,
    };

  const weeks =
    buildWeeks(
      view.year,
      view.month,
      todayIso
    );

  const baseYear =
    Number(
      todayIso.slice(
        0,
        4
      )
    );

  const years = [
    baseYear,
    baseYear + 1,
    baseYear + 2,
  ];

  const selectedLabels =
    selectedSlots
      .slice()
      .sort()
      .map(
        (slotId) =>
          SLOTS.find(
            (slot) =>
              slot.id ===
              slotId
          )?.label
      )
      .filter(
        (
          label
        ): label is string =>
          Boolean(label)
      );

  function toggleSlot(
    id: string
  ) {
    setSelectedSlots(
      (current) =>
        current.includes(id)
          ? current.filter(
              (slot) =>
                slot !== id
            )
          : [
              ...current,
              id,
            ]
    );

    setNotice("");
    setSuccess(false);
  }

  async function handleSubmit(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setNotice("");
    setSuccess(false);

    /* =====================================================
       AUTH
    ===================================================== */

    const token =
      localStorage.getItem(
        "access_token"
      );

    if (!token) {
      setNotice(
        "Please log in before requesting a studio space."
      );

      return;
    }

    /* =====================================================
       FORM DATA
    ===================================================== */

    const form =
      event.currentTarget;

    const formData =
      new FormData(
        form
      );

    const purpose =
      String(
        formData.get(
          "purpose"
        ) || ""
      ).trim();

    const notes =
      String(
        formData.get(
          "notes"
        ) || ""
      ).trim();

    /* =====================================================
       VALIDATION
    ===================================================== */

    if (
      !purpose
    ) {
      setNotice(
        "Please enter the kind of shoot."
      );

      return;
    }

    if (
      !selectedDate
    ) {
      setNotice(
        "Please select a date."
      );

      return;
    }

    if (
      selectedSlots.length ===
      0
    ) {
      setNotice(
        "Please select at least one time slot."
      );

      return;
    }

    /* =====================================================
       BUILD REQUESTED DATETIME RANGE
    ===================================================== */

    const sortedSlots =
      selectedSlots
        .slice()
        .sort(
          (a, b) =>
            a.localeCompare(
              b
            )
        );

    const earliest =
      sortedSlots[0];

    const latest =
      sortedSlots[
        sortedSlots.length -
          1
      ];

    const startDateTime =
      new Date(
        `${selectedDate}T${earliest}:00`
      );

    const endDateTime =
      new Date(
        `${selectedDate}T${latest}:00`
      );

    /*
     * Each slot represents one hour.
     *
     * Example:
     * 10:00 selected → 10:00 - 11:00
     * 12:00 selected → 12:00 - 13:00
     */
    endDateTime.setHours(
      endDateTime.getHours() +
        1
    );

    if (
      Number.isNaN(
        startDateTime.getTime()
      ) ||
      Number.isNaN(
        endDateTime.getTime()
      ) ||
      endDateTime <=
        startDateTime
    ) {
      setNotice(
        "Invalid time range. Please check your selected slots."
      );

      return;
    }

    /* =====================================================
       SUBMIT TO BACKEND
    ===================================================== */

    setLoading(true);

    try {
      console.log(
        "CREATING STUDIO RESERVATION",
        {
          requested_start:
            startDateTime.toISOString(),

          requested_end:
            endDateTime.toISOString(),

          purpose,

          notes:
            notes ||
            undefined,
        }
      );

      const response =
        await api.reservations.create(
          {
            requested_start:
              startDateTime.toISOString(),

            requested_end:
              endDateTime.toISOString(),

            purpose,

            notes:
              notes ||
              undefined,
          },
          token
        );

      const rawBody =
        await response.text();

      let data: unknown =
        null;

      if (rawBody) {
        try {
          data =
            JSON.parse(
              rawBody
            );
        } catch {
          data =
            rawBody;
        }
      }

      console.log(
        "STUDIO RESERVATION RESPONSE",
        {
          status:
            response.status,
          ok:
            response.ok,
          data,
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

        setNotice(
          "Your session has expired. Please log in again."
        );

        return;
      }

      if (
        response.status ===
        403
      ) {
        setNotice(
          getErrorMessage(
            data,
            "You do not have permission to create a studio request."
          )
        );

        return;
      }

      if (
        !response.ok
      ) {
        throw new Error(
          getErrorMessage(
            data,
            `Studio request failed (${response.status}).`
          )
        );
      }

      /* ===================================================
         SUCCESS
      =================================================== */

      setSuccess(
        true
      );

      setNotice("");

      setSelectedDate(
        null
      );

      setSelectedSlots(
        []
      );

      form.reset();
    } catch (error) {
      console.error(
        "STUDIO REQUEST FAILED",
        error
      );

      setSuccess(
        false
      );

      setNotice(
        error instanceof Error
          ? error.message
          : "Unable to submit your studio request."
      );
    } finally {
      setLoading(
        false
      );
    }
  }

  return (
    <div
      className={
        styles.page
      }
    >
      {/* ===================================================
          HEADER
      =================================================== */}

      <div className={styles.banner}>
  <span className={styles.bannerEyebrow}>
    Studio
  </span>

  <h1 className={styles.bannerTitle}>
    Request a Studio Space
  </h1>

  <p className={styles.bannerSubtitle}>
    Choose your shoot type, date and preferred studio hours.
  </p>
</div>

      {/* ===================================================
          FORM
      =================================================== */}

      <form
        className={
          styles.form
        }
        onSubmit={
          handleSubmit
        }
      >
        <div
          className={
            styles.formIntro
          }
        >
          <h2
            className={
              styles.formIntroTitle
            }
          >
            Studio request details
          </h2>

          <p
            className={
              styles.formIntroText
            }
          >
            Your request will be
            reviewed by the studio
            team before it is
            confirmed.
          </p>
        </div>

        <div
          className={
            styles.fieldGroup
          }
        >
          <label
            htmlFor="purpose"
            className={
              styles.fieldLabel
            }
          >
            Kind of Shoot
          </label>

          <input
            id="purpose"
            className={
              styles.field
            }
            type="text"
            name="purpose"
            placeholder="e.g. Portrait session, product shoot"
            maxLength={500}
            required
          />
        </div>

        <div
          className={
            styles.fieldGroup
          }
        >
          <label
            htmlFor="notes"
            className={
              styles.fieldLabel
            }
          >
            Reason for the Request
          </label>

          <textarea
            id="notes"
            className={`${styles.field} ${styles.textarea}`}
            name="notes"
            placeholder="Tell us anything we should know about the shoot or studio requirements."
          />
        </div>

        {/* =================================================
            CALENDAR
        ================================================= */}

        <p
          className={
            styles.legend
          }
          id="date-legend"
        >
          Choose your date
        </p>

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
              onChange={(
                event
              ) =>
                setViewOverride(
                  {
                    year:
                      view.year,
                    month:
                      Number(
                        event
                          .target
                          .value
                      ),
                  }
                )
              }
            >
              {MONTHS.map(
                (
                  name,
                  index
                ) => (
                  <option
                    key={name}
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
              onChange={(
                event
              ) =>
                setViewOverride(
                  {
                    year:
                      Number(
                        event
                          .target
                          .value
                      ),
                    month:
                      view.month,
                  }
                )
              }
            >
              {years.map(
                (
                  year
                ) => (
                  <option
                    key={year}
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
              (
                day
              ) => (
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
                key={index}
                className={
                  styles.week
                }
              >
                {week.map(
                  (
                    cell
                  ) => (
                    <button
                      key={
                        cell.key
                      }
                      type="button"
                      className={`${styles.day} ${
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

        {/* =================================================
            TIME
        ================================================= */}

        <p
          className={
            styles.legend
          }
          id="time-legend"
        >
          Choose your time{" "}
          <span
            className={
              styles.legendHint
            }
          >
            (Multiple slots can
            be chosen)
          </span>
        </p>

        <div
          className={
            styles.slots
          }
          role="group"
          aria-labelledby="time-legend"
        >
          {SLOTS.map(
            (
              slot
            ) => {
              const selected =
                selectedSlots.includes(
                  slot.id
                );

              return (
                <button
                  key={
                    slot.id
                  }
                  type="button"
                  className={`${styles.slot} ${
                    selected
                      ? styles.slotSelected
                      : ""
                  }`}
                  disabled={
                    slot.disabled
                  }
                  aria-pressed={
                    selected
                  }
                  onClick={() =>
                    toggleSlot(
                      slot.id
                    )
                  }
                >
                  <span
                    className={
                      styles.slotMark
                    }
                    aria-hidden="true"
                  />

                  {
                    slot.label
                  }
                </button>
              );
            }
          )}
        </div>

        {/* =================================================
            SELECTED SUMMARY
        ================================================= */}

        <div
          className={`${styles.selectionSummary} ${
            selectedDate &&
            selectedSlots.length >
              0
              ? ""
              : styles.selectionSummaryEmpty
          }`}
        >
          <span>
            {selectedDate
              ? `Date: ${selectedDate}`
              : "No date selected"}
          </span>

          <strong>
            {selectedSlots.length >
            0
              ? `${selectedSlots.length} slot${
                  selectedSlots.length ===
                  1
                    ? ""
                    : "s"
                } selected`
              : "Choose your time"}
          </strong>
        </div>

        {selectedLabels.length >
          0 && (
          <div
            className={
              styles.selectionSummary
            }
          >
            <span>
              Requested time
            </span>

            <strong>
              {
                selectedLabels.join(
                  ", "
                )
              }
            </strong>
          </div>
        )}

        {/* =================================================
            FEEDBACK
        ================================================= */}

        {notice && (
          <p
            className={
              styles.notice
            }
            role="alert"
          >
            {notice}
          </p>
        )}

        {success && (
          <p
            className={
              styles.success
            }
            role="status"
          >
            Your studio request has
            been submitted
            successfully. We'll review
            it and get back to you.
          </p>
        )}

        {/* =================================================
            SUBMIT
        ================================================= */}

        <div
          className={
            styles.submitRow
          }
        >
          <button
            className={
              styles.submit
            }
            type="submit"
            disabled={
              loading
            }
          >
            {loading
              ? "Submitting..."
              : "Send Request"}
          </button>
        </div>
      </form>
    </div>
  );
}