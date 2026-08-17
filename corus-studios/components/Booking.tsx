"use client";

import { useRouter } from "next/navigation";
import { useState, useRef, useEffect } from "react";
import Image from "next/image";
import api from "@/lib/api";
import { SessionType, Slot } from "@/lib/types";
import styles from "./Booking.module.css";

const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
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

  const prevMonthDays = new Date(year, month, 0).getDate();
  for (let i = firstWeekday - 1; i >= 0; i -= 1) {
    const d = prevMonthDays - i;
    const m = month === 0 ? 11 : month - 1;
    push(month === 0 ? year - 1 : year, m, d, true);
  }

  for (let d = 1; d <= daysInMonth; d += 1) push(year, month, d, false);

  let d = 1;
  while (week.length > 0) {
    const m = month === 11 ? 0 : month + 1;
    push(month === 11 ? year + 1 : year, m, d, true);
    d += 1;
  }

  return weeks;
}

// ─── Fallback packages ──────────────────────────────────────────
const FALLBACK_PACKAGES = [
  { id: "1", price: "GH₵100", description: "2 retouched pictures" },
  { id: "2", price: "GH₵150", description: "5 retouched pictures" },
  { id: "3", price: "GH₵250", description: "10 retouched pictures" },
];

export default function Booking({ todayIso }: { todayIso: string }) {
  const router = useRouter();
  const sectionRef = useRef<HTMLElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  // ─── Calendar state ──────────────────────────────────────────
  const [viewOverride, setViewOverride] = useState<{ year: number; month: number } | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const view = viewOverride ?? {
    year: Number(todayIso.slice(0, 4)),
    month: Number(todayIso.slice(5, 7)) - 1,
  };

  // ─── Session types (packages) ──────────────────────────────
  const [sessionTypes, setSessionTypes] = useState<SessionType[]>([]);
  const [loadingPackages, setLoadingPackages] = useState(true);
  const [selectedPackageId, setSelectedPackageId] = useState<string | null>(null);

  // ─── Available slots ──────────────────────────────────────
  const [availableSlots, setAvailableSlots] = useState<Slot[]>([]);
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null);

  // ─── UI state ──────────────────────────────────────────────
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState("");
  const [success, setSuccess] = useState(false);

  // ─── Fetch session types ──────────────────────────────────
  useEffect(() => {
    const fetchSessionTypes = async () => {
      try {
        const res = await api.sessions.types();
        if (!res.ok) throw new Error("Failed to load session types");
        const data = await res.json();
        setSessionTypes(data);
        if (data.length > 0) {
          setSelectedPackageId(data[0].id);
        } else {
          setSelectedPackageId(FALLBACK_PACKAGES[0]?.id || null);
        }
      } catch (err) {
        console.error(err);
        setNotice("Could not load packages. Using default packages.");
        setSelectedPackageId(FALLBACK_PACKAGES[0]?.id || null);
      } finally {
        setLoadingPackages(false);
      }
    };
    fetchSessionTypes();
  }, []);

  // ─── Fetch availability ──────────────────────────────────────
  useEffect(() => {
    if (!selectedDate) {
      setAvailableSlots([]);
      setSelectedSlotId(null);
      return;
    }
    const fetchSlots = async () => {
      try {
        const start = `${selectedDate}T00:00:00`;
        const end = `${selectedDate}T23:59:59`;
        const res = await api.sessions.availability(start, end);
        if (!res.ok) throw new Error("Failed to load availability");
        const data = await res.json();
        setAvailableSlots(data);
        if (data.length > 0) {
          setSelectedSlotId(data[0].id);
        } else {
          setSelectedSlotId(null);
        }
      } catch (err) {
        console.error(err);
        setNotice("Could not load available times.");
      }
    };
    fetchSlots();
  }, [selectedDate]);

  // ─── Intersection Observer ──────────────────────────────────
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.unobserve(entry.target);
        }
      },
      { threshold: 0.2 }
    );
    if (sectionRef.current) observer.observe(sectionRef.current);
    return () => {
      if (sectionRef.current) observer.unobserve(sectionRef.current);
    };
  }, []);

  // ─── Format price (only adds GH₵ if not already present) ──
  const formatPrice = (price: string) => {
    const num = parseFloat(price);
    if (isNaN(num)) return price;
    return `GH₵${num.toFixed(2)}`;
  };

  // ─── Build packages array ──────────────────────────────────
  const packages = sessionTypes.length > 0
    ? sessionTypes.map((st) => ({
        id: st.id,
        price: formatPrice(st.price_ghs),
        description: st.description || st.name,
      }))
    : FALLBACK_PACKAGES;

  // ─── Handle submit ──────────────────────────────────────────
  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setNotice("");
    setSuccess(false);

    const token = localStorage.getItem("access_token");
    if (!token) {
      setNotice("Please log in to book a session.");
      return;
    }

    if (!selectedDate) {
      setNotice("Please select a date.");
      return;
    }
    if (!selectedSlotId) {
      setNotice("Please select a time slot.");
      return;
    }
    if (!selectedPackageId) {
      setNotice("Please select a package.");
      return;
    }

    setLoading(true);
    try {
      const holdRes = await api.sessions.createHold(
        {
          slot_id: selectedSlotId,
          session_type_id: selectedPackageId,
        },
        token
      );
      const holdData = await holdRes.json();
      if (!holdRes.ok) {
        let msg = "Failed to create hold.";
        if (holdData.detail) {
          if (Array.isArray(holdData.detail)) {
            msg = holdData.detail.map((err: any) => err.msg).join(", ");
          } else {
            msg = holdData.detail;
          }
        }
        throw new Error(msg);
      }
      const holdId = holdData.id;

      const checkoutRes = await api.sessions.checkoutBooking(
        { hold_id: holdId },
        token
      );
      const checkoutData = await checkoutRes.json();
      if (!checkoutRes.ok) {
        let msg = "Checkout failed.";
        if (checkoutData.detail) {
          if (Array.isArray(checkoutData.detail)) {
            msg = checkoutData.detail.map((err: any) => err.msg).join(", ");
          } else {
            msg = checkoutData.detail;
          }
        }
        throw new Error(msg);
      }

      if (checkoutData.authorization_url) {
        window.location.href = checkoutData.authorization_url;
      } else {
        setSuccess(true);
        setNotice("✅ Booking confirmed! Thank you.");
      }
    } catch (err: any) {
      setNotice(err.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  // ─── Build calendar ──────────────────────────────────────────
  const weeks = buildWeeks(view.year, view.month, todayIso);
  const baseYear = Number(todayIso.slice(0, 4));
  const years = [baseYear, baseYear + 1, baseYear + 2];

  const timeOptions = availableSlots.map((slot) => {
    const start = new Date(slot.starts_at);
    const end = new Date(slot.ends_at);
    const label = `${start.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })} - ${end.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}`;
    return { id: slot.id, label };
  });

  return (
    <section
      ref={sectionRef}
      className={`${styles.bookingSection} ${isVisible ? styles.visible : ""}`}
      id="booking"
    >
      <div className={`${styles.imageLeft} ${isVisible ? styles.imageVisible : ""}`}>
        <Image src="/images/booking-left.png" alt="Decorative left" fill className={styles.image} />
      </div>
      <div className={`${styles.imageRight} ${isVisible ? styles.imageVisible : ""}`}>
        <Image src="/images/booking-right.png" alt="Decorative right" fill className={styles.image} />
      </div>

      <h2>Book a Session Today</h2>

      <form className={styles.form} onSubmit={handleSubmit}>
        <input type="text" placeholder="Full Name" required />
        <div className={styles.row}>
          <div className={styles.phoneGroup}>
            <span>+233</span>
            <input type="tel" placeholder="Phone Number" required />
          </div>
          <select required defaultValue="">
            <option value="" disabled hidden>
              Kind of Photoshoot
            </option>
            <option>Birthday</option>
            <option>Graduation</option>
            <option>Matriculation</option>
            <option>Agenda</option>
            <option>Wedding</option>
          </select>
        </div>

        {/* Calendar */}
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

        {/* Time dropdown */}
        <select
          required
          value={selectedSlotId || ""}
          onChange={(e) => setSelectedSlotId(e.target.value || null)}
        >
          <option value="" disabled>
            {availableSlots.length === 0 ? "No slots available" : "Choose booking time"}
          </option>
          {timeOptions.map((opt) => (
            <option key={opt.id} value={opt.id}>
              {opt.label}
            </option>
          ))}
        </select>

        {/* Packages */}
        {loadingPackages ? (
          <div className={styles.loadingPackages}>Loading packages...</div>
        ) : (
          <div className={styles.packageContainer}>
            {packages.map((pkg) => (
              <div
                key={pkg.id}
                onClick={() => setSelectedPackageId(pkg.id)}
                className={`${styles.packageCard} ${
                  selectedPackageId === pkg.id ? styles.active : ""
                }`}
              >
                <h3>{pkg.price}</h3>
                <p>{pkg.description}</p>
              </div>
            ))}
          </div>
        )}

        {notice && <div className={styles.notice}>{notice}</div>}
        {success && <div className={styles.success}>✅ Booking confirmed! You will receive a confirmation email.</div>}

        <button className={styles.submit} type="submit" disabled={loading}>
          {loading ? "Processing..." : "Book"}
        </button>
      </form>
    </section>
  );
}