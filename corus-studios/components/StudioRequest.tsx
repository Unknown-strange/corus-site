"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { useState } from "react";
import api from "@/lib/api";
import styles from "./StudioRequest.module.css";

const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

/**
 * Opening hours as drawn in the design — note the gaps at 01pm and 05pm.
 *
 * `disabled` is where per-date availability will go. It is always false today
 * because there is no endpoint to read it from: `/sessions/availability`
 * covers session slots, and studio reservations are free-form datetime ranges
 * with no slot table behind them. Nothing here is faked as unavailable.
 */
const SLOTS = [
  { id: "10:00", label: "10am -11am", disabled: false },
  { id: "11:00", label: "11am -12pm", disabled: false },
  { id: "12:00", label: "12pm -01pm", disabled: false },
  { id: "14:00", label: "02pm -03pm", disabled: false },
  { id: "15:00", label: "03pm -04pm", disabled: false },
  { id: "16:00", label: "04pm -05pm", disabled: false },
  { id: "18:00", label: "06pm -07pm", disabled: false },
  { id: "19:00", label: "07pm -08pm", disabled: false },
  { id: "20:00", label: "08pm -09pm", disabled: false },
];

type Cell = { key: string; day: number; outside: boolean; past: boolean; iso: string };

function toIso(year: number, month: number, day: number) {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function buildWeeks(year: number, month: number, todayIso: string): Cell[][] {
  const firstWeekday = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const weeks: Cell[][] = [];
  let week: Cell[] = [];

  const push = (y: number, m: number, d: number, outside: boolean) => {
    const iso = toIso(y, m, d);
    week.push({ key: `${iso}-${outside}`, day: d, outside, past: iso < todayIso, iso });
    if (week.length === 7) {
      weeks.push(week);
      week = [];
    }
  };

  // Trailing days of the previous month
  const prevMonthDays = new Date(year, month, 0).getDate();
  for (let i = firstWeekday - 1; i >= 0; i -= 1) {
    const d = prevMonthDays - i;
    const m = month === 0 ? 11 : month - 1;
    push(month === 0 ? year - 1 : year, m, d, true);
  }

  for (let d = 1; d <= daysInMonth; d += 1) push(year, month, d, false);

  // Leading days of the next month, to finish the final row
  let d = 1;
  while (week.length > 0) {
    const m = month === 11 ? 0 : month + 1;
    push(month === 11 ? year + 1 : year, m, d, true);
    d += 1;
  }

  return weeks;
}

/**
 * `todayIso` is resolved on the server, in the studio's timezone, and passed
 * in as a prop.
 */
export default function StudioRequest({ todayIso }: { todayIso: string }) {
  const [viewOverride, setViewOverride] = useState<{ year: number; month: number } | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedSlots, setSelectedSlots] = useState<string[]>([]);
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const view = viewOverride ?? {
    year: Number(todayIso.slice(0, 4)),
    month: Number(todayIso.slice(5, 7)) - 1,
  };

  function toggleSlot(id: string) {
    setSelectedSlots((current) =>
      current.includes(id) ? current.filter((s) => s !== id) : [...current, id]
    );
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setNotice("");
    setSuccess(false);
    setLoading(false);

    // 1. Validate date and slots
    if (!selectedDate) {
      setNotice("Please select a date.");
      return;
    }
    if (selectedSlots.length === 0) {
      setNotice("Please select at least one time slot.");
      return;
    }

    // 2. Get token
    const token = localStorage.getItem("access_token");
    if (!token) {
      setNotice("You must be logged in to request a studio space.");
      return;
    }

    // 3. Gather form data (purpose + notes)
    const form = event.currentTarget;
    const formData = new FormData(form);
    const purpose = formData.get("purpose") as string;
    const notes = formData.get("notes") as string;

    if (!purpose) {
      setNotice("Please enter the purpose of your shoot.");
      return;
    }

    // 4. Combine slots into a single contiguous range
    // Sort the selected slot IDs (they are like "10:00", "11:00", ...)
    const sortedSlots = selectedSlots.slice().sort();
    const earliest = sortedSlots[0];
    const latest = sortedSlots[sortedSlots.length - 1];

    const startDateTime = new Date(`${selectedDate}T${earliest}:00`);
    const endDateTime = new Date(`${selectedDate}T${latest}:00`);
    // Add 1 hour to the latest slot because each slot represents an hour (e.g., "10:00" means 10am-11am)
    endDateTime.setHours(endDateTime.getHours() + 1);

    if (isNaN(startDateTime.getTime()) || isNaN(endDateTime.getTime()) || endDateTime <= startDateTime) {
      setNotice("Invalid time range. Please check your selection.");
      return;
    }

    setLoading(true);

    try {
      const response = await api.reservations.create(
        {
          requested_start: startDateTime.toISOString(),
          requested_end: endDateTime.toISOString(),
          purpose,
          notes: notes || undefined,
        },
        token
      );

      const data = await response.json();

      if (!response.ok) {
        let msg = "Failed to submit request.";
        if (data.detail) {
          if (Array.isArray(data.detail)) {
            msg = data.detail.map((err: any) => err.msg).join(", ");
          } else {
            msg = data.detail;
          }
        }
        throw new Error(msg);
      }

      // Success
      setSuccess(true);
      setNotice("");
      // Optionally reset the form
      setSelectedDate(null);
      setSelectedSlots([]);
      // Maybe redirect after a delay
      // router.push("/reservations/me");
    } catch (err: any) {
      setNotice(err.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  const weeks = buildWeeks(view.year, view.month, todayIso);
  const baseYear = Number(todayIso.slice(0, 4));
  const years = [baseYear, baseYear + 1, baseYear + 2];

  return (
    <div className={styles.page}>
      <div className={styles.banner}>
        <Link href="/rentals" className={styles.back}>
          <ArrowLeft size={18} aria-hidden="true" />
          Back
        </Link>
        <h1 className={styles.bannerTitle}>Request a Studio Space</h1>
      </div>

      <form className={styles.form} onSubmit={handleSubmit}>
        {/* ─── Removed first_name & last_name fields ─── */}

        <input
          className={styles.field}
          type="text"
          name="purpose"
          placeholder="Kind of Shoot"
          aria-label="Kind of shoot"
          maxLength={500}
          required
        />

        <textarea
          className={`${styles.field} ${styles.textarea}`}
          name="notes"
          placeholder="Reason for the request"
          aria-label="Reason for the request"
        />

        <p className={styles.legend} id="date-legend">
          Choose your date
        </p>

        <div className={styles.calendar} role="group" aria-labelledby="date-legend">
          <div className={styles.calendarHead}>
            <select
              className={styles.select}
              aria-label="Month"
              value={view.month}
              onChange={(e) =>
                setViewOverride({ year: view.year, month: Number(e.target.value) })
              }
            >
              {MONTHS.map((name, index) => (
                <option key={name} value={index}>
                  {name}
                </option>
              ))}
            </select>

            <select
              className={styles.select}
              aria-label="Year"
              value={view.year}
              onChange={(e) =>
                setViewOverride({ year: Number(e.target.value), month: view.month })
              }
            >
              {years.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          </div>

          <div className={styles.weekdays}>
            {WEEKDAYS.map((day) => (
              <div key={day} className={styles.weekday}>
                {day}
              </div>
            ))}
          </div>

          {weeks.map((week, index) => (
            <div key={index} className={styles.week}>
              {week.map((cell) => (
                <button
                  key={cell.key}
                  type="button"
                  className={`${styles.day} ${cell.outside ? styles.dayOutside : ""} ${
                    selectedDate === cell.iso ? styles.daySelected : ""
                  }`}
                  disabled={cell.past}
                  aria-pressed={selectedDate === cell.iso}
                  onClick={() => setSelectedDate(cell.iso)}
                >
                  {cell.day}
                </button>
              ))}
            </div>
          ))}
        </div>

        <p className={styles.legend} id="time-legend">
          Choose your time <span className={styles.legendHint}>(Multiple slots can be chosen)</span>
        </p>

        <div className={styles.slots} role="group" aria-labelledby="time-legend">
          {SLOTS.map((slot) => {
            const selected = selectedSlots.includes(slot.id);
            return (
              <button
                key={slot.id}
                type="button"
                className={`${styles.slot} ${selected ? styles.slotSelected : ""}`}
                disabled={slot.disabled}
                aria-pressed={selected}
                onClick={() => toggleSlot(slot.id)}
              >
                <span className={styles.slotMark} aria-hidden="true" />
                {slot.label}
              </button>
            );
          })}
        </div>

        {notice && (
          <p className={styles.notice} role="status">
            {notice}
          </p>
        )}

        {success && (
          <p className={styles.success} role="status">
            ✅ Your request has been submitted! We'll review it and get back to you.
          </p>
        )}

        <div className={styles.submitRow}>
          <button className={styles.submit} type="submit" disabled={loading}>
            {loading ? "Submitting..." : "Send Request"}
          </button>
        </div>
      </form>
    </div>
  );
}