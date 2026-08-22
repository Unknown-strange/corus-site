"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  CalendarDays,
  CheckCircle2,
  Clock3,
  CreditCard,
  Loader2,
  UserRound,
  Phone,
  Camera,
} from "lucide-react";

import api from "@/lib/api";
import type {
  SessionType,
  Slot,
} from "@/lib/types";

import styles from "./WalkInBooking.module.css";

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

type WalkInResult = {
  booking_id?: string;
  payment_method?: string;
  status?: string;
  reference?: string;
  amount_paid_ghs?: string;
  total_price_ghs?: string;
  balance_due_ghs?: string;
  receipt_number?: string;
  authorization_url?: string;
  public_key?: string;
  message?: string;
};

function toIso(
  year: number,
  month: number,
  day: number
) {
  return `${year}-${String(
    month + 1
  ).padStart(2, "0")}-${String(
    day
  ).padStart(2, "0")}`;
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
    const iso =
      toIso(
        y,
        m,
        d
      );

    week.push({
      key: `${iso}-${outside}`,
      day: d,
      outside,
      past:
        iso <
        todayIso,
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

function formatMoney(
  value: string | number
) {
  const number =
    Number(value);

  if (
    !Number.isFinite(
      number
    )
  ) {
    return "0.00";
  }

  return number.toLocaleString(
    "en-GH",
    {
      minimumFractionDigits:
        2,

      maximumFractionDigits:
        2,
    }
  );
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
    const value =
      data as {
        detail?: unknown;
        message?: unknown;
        error?: {
          message?: unknown;
        };
      };

    if (
      typeof value.detail ===
      "string"
    ) {
      return value.detail;
    }

    if (
      Array.isArray(
        value.detail
      )
    ) {
      const messages =
        value.detail
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
              item
            ): item is string =>
              Boolean(item)
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
      typeof value.message ===
      "string"
    ) {
      return value.message;
    }

    if (
      typeof value.error
        ?.message ===
      "string"
    ) {
      return value.error
        .message;
    }
  }

  return fallback;
}

export default function WalkInBooking({
  todayIso,
}: {
  todayIso: string;
}) {
  const [
    sessionTypes,
    setSessionTypes,
  ] =
    useState<SessionType[]>(
      []
    );

  const [
    loadingPackages,
    setLoadingPackages,
  ] =
    useState(true);

  const [
    sessionTypeError,
    setSessionTypeError,
  ] =
    useState<
      string | null
    >(null);

  const [
    selectedPackageId,
    setSelectedPackageId,
  ] =
    useState<string | null>(
      null
    );

  const [
    selectedDate,
    setSelectedDate,
  ] =
    useState<string | null>(
      null
    );

  const [
    availableSlots,
    setAvailableSlots,
  ] =
    useState<Slot[]>(
      []
    );

  const [
    loadingSlots,
    setLoadingSlots,
  ] =
    useState(false);

  const [
    selectedSlotId,
    setSelectedSlotId,
  ] =
    useState<string | null>(
      null
    );

  const [
    paymentMethod,
    setPaymentMethod,
  ] =
    useState<
      "offline" | "paystack"
    >("offline");

  const [
    loading,
    setLoading,
  ] =
    useState(false);

  const [
    success,
    setSuccess,
  ] =
    useState(false);

  const [
    result,
    setResult,
  ] =
    useState<
      WalkInResult | null
    >(null);

  const [
    notice,
    setNotice,
  ] =
    useState("");

  const [
    viewOverride,
    setViewOverride,
  ] =
    useState<{
      year: number;
      month: number;
    } | null>(
      null
    );

  /* =========================================================
     PACKAGE
  ========================================================= */

  const selectedPackage =
    useMemo(
      () =>
        sessionTypes.find(
          (
            item
          ) =>
            item.id ===
            selectedPackageId
        ) || null,
      [
        sessionTypes,
        selectedPackageId,
      ]
    );

  /* =========================================================
     CALENDAR VIEW
  ========================================================= */

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

  /* =========================================================
     SESSION TYPES
  ========================================================= */

  useEffect(() => {
    let cancelled =
      false;

    const loadSessionTypes =
      async () => {
        try {
          setLoadingPackages(
            true
          );

          setSessionTypeError(
            null
          );

          const response =
            await api.sessions.types();

          if (
            !response.ok
          ) {
            const raw =
              await response.text();

            let data:
              unknown =
              null;

            try {
              data =
                JSON.parse(
                  raw
                );
            } catch {
              data =
                raw;
            }

            throw new Error(
              getErrorMessage(
                data,
                "Failed to load session packages."
              )
            );
          }

          const data =
            (await response.json()) as SessionType[];

          if (
            cancelled
          ) {
            return;
          }

          setSessionTypes(
            data
          );

          if (
            data.length > 0
          ) {
            setSelectedPackageId(
              data[0].id
            );
          }
        } catch (
          error
        ) {
          if (
            cancelled
          ) {
            return;
          }

          setSessionTypes(
            []
          );

          setSelectedPackageId(
            null
          );

          setSessionTypeError(
            error instanceof Error
              ? error.message
              : "Could not load session packages."
          );
        } finally {
          if (
            !cancelled
          ) {
            setLoadingPackages(
              false
            );
          }
        }
      };

    loadSessionTypes();

    return () => {
      cancelled = true;
    };
  }, []);

  /* =========================================================
     AVAILABILITY
  ========================================================= */

  useEffect(() => {
    if (
      !selectedDate
    ) {
      setAvailableSlots(
        []
      );

      setSelectedSlotId(
        null
      );

      return;
    }

    let cancelled =
      false;

    const loadAvailability =
      async () => {
        try {
          setLoadingSlots(
            true
          );

          setNotice(
            ""
          );

          setSelectedSlotId(
            null
          );

          const start =
            `${selectedDate}T00:00:00`;

          const end =
            `${selectedDate}T23:59:59`;

          const response =
            await api.sessions.availability(
              start,
              end
            );

          if (
            !response.ok
          ) {
            const raw =
              await response.text();

            let data:
              unknown =
              null;

            try {
              data =
                JSON.parse(
                  raw
                );
            } catch {
              data =
                raw;
            }

            throw new Error(
              getErrorMessage(
                data,
                "Could not load available times."
              )
            );
          }

          const data =
            (await response.json()) as Slot[];

          if (
            cancelled
          ) {
            return;
          }

          setAvailableSlots(
            data
          );
        } catch (
          error
        ) {
          if (
            cancelled
          ) {
            return;
          }

          setAvailableSlots(
            []
          );

          setSelectedSlotId(
            null
          );

          setNotice(
            error instanceof Error
              ? error.message
              : "Could not load available times."
          );
        } finally {
          if (
            !cancelled
          ) {
            setLoadingSlots(
              false
            );
          }
        }
      };

    loadAvailability();

    return () => {
      cancelled = true;
    };
  }, [
    selectedDate,
  ]);

  /* =========================================================
     RESET DEPENDENT DATA WHEN PACKAGE CHANGES
  ========================================================= */

  useEffect(() => {
    setSuccess(
      false
    );

    setResult(
      null
    );

    setNotice(
      ""
    );
  }, [
    selectedPackageId,
  ]);

  /* =========================================================
     SUBMIT
  ========================================================= */

  const handleSubmit =
    async (
      event: React.FormEvent<HTMLFormElement>
    ) => {
      event.preventDefault();

      setNotice("");
      setSuccess(
        false
      );
      setResult(
        null
      );

      const token =
        localStorage.getItem(
          "access_token"
        );

      if (!token) {
        setNotice(
          "Please log in to create a walk-in booking."
        );

        return;
      }

      const form =
        event.currentTarget;

      const formData =
        new FormData(
          form
        );

      const customerFullName =
        String(
          formData.get(
            "customer_full_name"
          ) ||
            ""
        ).trim();

      const customerPhone =
        String(
          formData.get(
            "customer_phone"
          ) ||
            ""
        ).trim();

      const picturesCount =
        Number(
          formData.get(
            "pictures_count"
          ) || 0
        );

      const picturePickupDate =
        String(
          formData.get(
            "picture_pickup_date"
          ) ||
            ""
        );

      const amountPaid =
        Number(
          formData.get(
            "amount_paid_ghs"
          ) ||
            0
        );

      if (
        !customerFullName
      ) {
        setNotice(
          "Enter the client's full name."
        );

        return;
      }

      if (
        !customerPhone
      ) {
        setNotice(
          "Enter the client's phone number."
        );

        return;
      }

      if (
        !selectedPackage
      ) {
        setNotice(
          "Select a session package."
        );

        return;
      }

      if (
        !selectedDate
      ) {
        setNotice(
          "Select a booking date."
        );

        return;
      }

      if (
        !selectedSlotId
      ) {
        setNotice(
          "Select an available time slot."
        );

        return;
      }

      if (
        !picturePickupDate
      ) {
        setNotice(
          "Select the picture pickup date."
        );

        return;
      }

      if (
        !Number.isFinite(
          picturesCount
        ) ||
        picturesCount <
          0
      ) {
        setNotice(
          "Enter a valid number of pictures."
        );

        return;
      }

      if (
        !Number.isFinite(
          amountPaid
        ) ||
        amountPaid <
          0
      ) {
        setNotice(
          "Enter a valid amount paid."
        );

        return;
      }

      setLoading(
        true
      );

      try {
        const slot =
          availableSlots.find(
            (
              item
            ) =>
              item.id ===
              selectedSlotId
          );

        if (
          !slot
        ) {
          throw new Error(
            "The selected time slot is no longer available."
          );
        }

        /*
         * This is deliberately generated at submission time
         * because accepted_at represents when the walk-in
         * request was accepted.
         */
        const acceptedAt =
          new Date().toISOString();

        const payload = {
          customer_full_name:
            customerFullName,

          customer_phone:
            customerPhone,

          session_type_id:
            selectedPackage.id,

          package_name:
            selectedPackage.name,

          package_description:
            selectedPackage.description,

          package_price_ghs:
            Number(
              selectedPackage.price_ghs
            ),

          package_duration_minutes:
            Math.max(
              1,
              Math.round(
                Number(
                  (
                    selectedPackage as SessionType & {
                      duration_minutes?: number;
                    }
                  )
                    .duration_minutes ??
                    60
                )
              )
            ),

          slot_id:
            selectedSlotId,

          pictures_count:
            picturesCount,

          picture_pickup_date:
            picturePickupDate,

          accepted_at:
            acceptedAt,

          payment_method:
            paymentMethod,

          amount_paid_ghs:
            amountPaid,
        };

        console.log(
          "CREATING WALK-IN BOOKING",
          payload
        );

        const response =
          await api.sessions.createWalkInBooking(
            payload,
            token
          );

        const raw =
          await response.text();

        let data:
          unknown = null;

        if (
          raw
        ) {
          try {
            data =
              JSON.parse(
                raw
              );
          } catch {
            data =
              raw;
          }
        }

        console.log(
          "WALK-IN BOOKING RESPONSE",
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

          window.location.href =
            "/login";

          return;
        }

        if (
          !response.ok
        ) {
          throw new Error(
            getErrorMessage(
              data,
              `Walk-in booking failed (${response.status}).`
            )
          );
        }

        const booking =
          data as WalkInResult;

        setResult(
          booking
        );

        setSuccess(
          true
        );

        /*
         * If the backend returns an authorization URL for
         * online payment, open it separately.
         */
        if (
          paymentMethod ===
            "paystack" &&
          booking.authorization_url
        ) {
          const paymentWindow =
            window.open(
              booking.authorization_url,
              "_blank"
            );

          if (
            paymentWindow
          ) {
            paymentWindow.focus();
          } else {
            setNotice(
              "The payment window was blocked by your browser. Please allow pop-ups."
            );
          }
        }

        /*
         * Clear booking-specific fields after successful
         * submission but keep the result visible.
         */
        setSelectedSlotId(
          null
        );

        form.reset();

        setSelectedPackageId(
          sessionTypes[0]?.id ||
            null
        );
      } catch (
        error
      ) {
        console.error(
          "WALK-IN BOOKING FAILED",
          error
        );

        setNotice(
          error instanceof Error
            ? error.message
            : "Unable to create the walk-in booking."
        );
      } finally {
        setLoading(
          false
        );
      }
    };

  /* =========================================================
     SLOT LABEL
  ========================================================= */

  const getSlotLabel =
    (
      slot: Slot
    ) => {
      const start =
        new Date(
          slot.starts_at
        );

      const end =
        new Date(
          slot.ends_at
        );

      return `${start.toLocaleTimeString(
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
      )}`;
    };

  return (
    <section
      className={
        styles.section
      }
    >
      <div
        className={
          styles.card
        }
      >
        {/* =================================================
            HEADER
        ================================================= */}

        <div
          className={
            styles.cardHeader
          }
        >
          <span
            className={
              styles.eyebrow
            }
          >
            Walk-In
          </span>

          <h2>
            Create a Walk-In Booking
          </h2>
        </div>

        <form
          className={
            styles.form
          }
          onSubmit={
            handleSubmit
          }
        >
          {/* =================================================
              CLIENT DETAILS
          ================================================= */}

          <div
            className={
              styles.sectionTitle
            }
          >
            <UserRound
              size={17}
            />

            <span>
              Details
            </span>
          </div>

          <div
            className={
              styles.fieldGrid
            }
          >
            <label
              className={
                styles.fieldGroup
              }
            >
              <span>
                Full Name
              </span>

              <div
                className={
                  styles.inputWrap
                }
              >
                <UserRound
                  size={16}
                />

                <input
                  type="text"
                  name="customer_full_name"
                  placeholder="Full name"
                  required
                />
              </div>
            </label>

            <label
              className={
                styles.fieldGroup
              }
            >
              <span>
                Phone Number
              </span>

              <div
                className={
                  styles.inputWrap
                }
              >
                <Phone
                  size={16}
                />

                <input
                  type="tel"
                  name="customer_phone"
                  placeholder="024 000 0000"
                  required
                />
              </div>
            </label>
          </div>

          {/* =================================================
              PACKAGE
          ================================================= */}

          <div
            className={
              styles.sectionTitle
            }
          >
            <Camera
              size={17}
            />

            <span>
              Session Package
            </span>
          </div>

          {loadingPackages ? (
            <div
              className={
                styles.loadingBox
              }
            >
              <Loader2
                size={17}
                className={
                  styles.spinner
                }
              />

              Loading packages...
            </div>
          ) : sessionTypeError ? (
            <div
              className={
                styles.notice
              }
            >
              {
                sessionTypeError
              }
            </div>
          ) : (
            <div
              className={
                styles.packageGrid
              }
            >
              {sessionTypes.map(
                (
                  session
                ) => {
                  const active =
                    selectedPackageId ===
                    session.id;

                  return (
                    <button
                      type="button"
                      key={
                        session.id
                      }
                      className={`${styles.packageCard} ${
                        active
                          ? styles.packageActive
                          : ""
                      }`}
                      onClick={() =>
                        setSelectedPackageId(
                          session.id
                        )
                      }
                    >
                      <span
                        className={
                          styles.packageName
                        }
                      >
                        {
                          session.name
                        }
                      </span>

                      <strong>
                        GH₵
                        {formatMoney(
                          session.price_ghs
                        )}
                      </strong>

                      <small>
                        {
                          session.description
                        }
                      </small>
                    </button>
                  );
                }
              )}
            </div>
          )}

          {/* =================================================
              DATE
          ================================================= */}

          <div
            className={
              styles.sectionTitle
            }
          >
            <CalendarDays
              size={17}
            />

            <span>
              Date & Time
            </span>
          </div>

          <div
            className={
              styles.calendar
            }
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
                      {
                        name
                      }
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
                  (
                    year
                  ) => (
                    <option
                      key={
                        year
                      }
                      value={
                        year
                      }
                    >
                      {
                        year
                      }
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
                  key={
                    index
                  }
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

          <div
            className={
              styles.selectedDate
            }
          >
            <CalendarDays
              size={15}
            />

            {selectedDate
              ? `Selected: ${selectedDate}`
              : "Select a date"}
          </div>

          {/* =================================================
              SLOTS
          ================================================= */}

          {selectedDate && (
            <div>
              {loadingSlots ? (
                <div
                  className={
                    styles.loadingBox
                  }
                >
                  <Loader2
                    size={17}
                    className={
                      styles.spinner
                    }
                  />

                  Loading available
                  times...
                </div>
              ) : availableSlots.length ===
                0 ? (
                <div
                  className={
                    styles.notice
                  }
                >
                  No available times for
                  this date.
                </div>
              ) : (
                <div
                  className={
                    styles.slots
                  }
                >
                  {availableSlots.map(
                    (
                      slot
                    ) => (
                      <button
                        type="button"
                        key={
                          slot.id
                        }
                        className={`${styles.slot} ${
                          selectedSlotId ===
                          slot.id
                            ? styles.slotActive
                            : ""
                        }`}
                        onClick={() =>
                          setSelectedSlotId(
                            slot.id
                          )
                        }
                      >
                        <Clock3
                          size={15}
                        />

                        {
                          getSlotLabel(
                            slot
                          )}
                      </button>
                    )
                  )}
                </div>
              )}
            </div>
          )}

          {/* =================================================
              PICTURES
          ================================================= */}

          <div
            className={
              styles.sectionTitle
            }
          >
            <Camera
              size={17}
            />

            <span>
              Picture Details
            </span>
          </div>

          <div
            className={
              styles.fieldGrid
            }
          >
            <label
              className={
                styles.fieldGroup
              }
            >
              <span>
                Number of Pictures
              </span>

              <input
                className={
                  styles.simpleInput
                }
                type="number"
                name="pictures_count"
                min="0"
                step="1"
                defaultValue="0"
              />
            </label>

            <label
              className={
                styles.fieldGroup
              }
            >
              <span>
                Picture Pickup Date
              </span>

              <input
                className={
                  styles.simpleInput
                }
                type="date"
                name="picture_pickup_date"
                min={
                  selectedDate ||
                  todayIso
                }
                defaultValue={
                  selectedDate ||
                  todayIso
                }
                required
              />
            </label>
          </div>

          {/* =================================================
              PAYMENT
          ================================================= */}

          <div
            className={
              styles.sectionTitle
            }
          >
            <CreditCard
              size={17}
            />

            <span>
              Payment
            </span>
          </div>

          <div
            className={
              styles.paymentGrid
            }
          >
            <label
              className={
                styles.fieldGroup
              }
            >
              <span>
                Payment Method
              </span>

              <select
                className={
                  styles.simpleInput
                }
                value={
                  paymentMethod
                }
                onChange={(
                  event
                ) =>
                  setPaymentMethod(
                    event.target
                      .value as
                      | "offline"
                      | "paystack"
                  )
                }
              >
                <option value="offline">
                  Offline / Cash
                </option>

                <option value="paystack">
                  Paystack
                </option>
              </select>
            </label>

            <label
              className={
                styles.fieldGroup
              }
            >
              <span>
                Amount Paid (GH₵)
              </span>

              <input
                className={
                  styles.simpleInput
                }
                type="number"
                name="amount_paid_ghs"
                min="0"
                step="0.01"
                defaultValue="0"
                required
              />
            </label>
          </div>

          {/* =================================================
              SUMMARY
          ================================================= */}

          {selectedPackage && (
            <div
              className={
                styles.summary
              }
            >
              <div>
                <span>
                  Package
                </span>

                <strong>
                  {
                    selectedPackage.name
                  }
                </strong>
              </div>

              <div>
                <span>
                  Package Price
                </span>

                <strong>
                  GH₵
                  {formatMoney(
                    selectedPackage.price_ghs
                  )}
                </strong>
              </div>

              <div>
                <span>
                  Date
                </span>

                <strong>
                  {
                    selectedDate ||
                    "Not selected"
                  }
                </strong>
              </div>

              <div>
                <span>
                  Time
                </span>

                <strong>
                  {selectedSlotId
                    ? getSlotLabel(
                        availableSlots.find(
                          (
                            slot
                          ) =>
                            slot.id ===
                            selectedSlotId
                        )!
                      )
                    : "Not selected"}
                </strong>
              </div>
            </div>
          )}

          {/* =================================================
              NOTICES
          ================================================= */}

          {notice && (
            <div
              className={
                styles.notice
              }
              role="alert"
            >
              {
                notice
              }
            </div>
          )}

          {/* =================================================
              SUCCESS
          ================================================= */}

          {success &&
            result && (
              <div
                className={
                  styles.success
                }
              >
                <CheckCircle2
                  size={22}
                />

                <div>
                  <strong>
                    Walk-in booking
                    created
                  </strong>

                  <span>
                    {
                      result.message ||
                      "The walk-in booking was created successfully."
                    }
                  </span>

                  {result.receipt_number && (
                    <span>
                      Receipt:{" "}
                      {
                        result.receipt_number
                      }
                    </span>
                  )}

                  {result.booking_id && (
                    <span>
                      Booking ID:{" "}
                      {
                        result.booking_id
                      }
                    </span>
                  )}
                </div>
              </div>
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
              type="submit"
              className={
                styles.submit
              }
              disabled={
                loading ||
                loadingPackages ||
                loadingSlots ||
                !selectedPackageId ||
                !selectedSlotId
              }
            >
              {loading ? (
                <>
                  <Loader2
                    size={17}
                    className={
                      styles.spinner
                    }
                  />

                  Creating Booking...
                </>
              ) : (
                <>
                  <CheckCircle2
                    size={17}
                  />

                  Create Walk-In Booking
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </section>
  );
}