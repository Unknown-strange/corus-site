"use client";

import { useRouter } from "next/navigation";
import { useState, useRef, useEffect } from "react";
import { ArrowLeft } from "lucide-react";
import Image from "next/image";
import styles from "./Booking.module.css";



const packages = [
  {
    id: 1,
    price: "GH₵100",
    description: "2 retouched pictures",
  },
  {
    id: 2,
    price: "GH₵150",
    description: "5 retouched pictures",
  },
  {
    id: 3,
    price: "GH₵250",
    description: "10 retouched pictures",
  },
];

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

export default function Booking({ todayIso }: { todayIso: string }) {
  const [selectedPackage, setSelectedPackage] = useState(1);
  const router = useRouter();
  const [viewOverride, setViewOverride] = useState<{ year: number; month: number } | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  
    const view = viewOverride ?? {
    year: Number(todayIso.slice(0, 4)),
    month: Number(todayIso.slice(5, 7)) - 1,
  };


  /**
   * Booking a session needs an account — POST /sessions/holds and
   * /sessions/bookings/checkout are both customer-only.
   *
   * The app has no auth state yet, so every visitor is sent to sign up. Once
   * the session context exists, check it here and only redirect when signed
   * out; a signed-in customer should go on to the real booking flow instead.
   */
  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    router.push("/signup");
  }
  const sectionRef = useRef<HTMLElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.unobserve(entry.target);
        }
      },
      { threshold: 0.2 } // trigger when 20% of section is visible
    );

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    return () => {
      if (sectionRef.current) {
        observer.unobserve(sectionRef.current);
      }
    };
  }, []);

    const weeks = buildWeeks(view.year, view.month, todayIso);
    const baseYear = Number(todayIso.slice(0, 4));
    const years = [baseYear, baseYear + 1, baseYear + 2];

  return (
    <section
      ref={sectionRef}
      className={`${styles.bookingSection} ${isVisible ? styles.visible : ""}`}
      id="booking"
    >
      {/* Left decorative image */}
      <div className={`${styles.imageLeft} ${isVisible ? styles.imageVisible : ""}`}>
        <Image
          src="/images/booking-left.png"   // ← replace with your image path
          alt="Decorative left"
          fill
          className={styles.image}
        />
      </div>

      {/* Right decorative image */}
      <div className={`${styles.imageRight} ${isVisible ? styles.imageVisible : ""}`}>
        <Image
          src="/images/booking-right.png"  // ← replace with your image path
          alt="Decorative right"
          fill
          className={styles.image}
        />
      </div>

      <h2>Book a Session Today</h2>

      <form className={styles.form} onSubmit={handleSubmit}>

        {/* Full Name */}
        <input type="text" placeholder="Full Name" required />

        {/* Phone + Photoshoot */}
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

        {/* Date */}
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

        {/* Time */}
        <select required defaultValue="">
          <option value="" disabled hidden>
            Choose booking time
          </option>
          <option>08:00 AM</option>
          <option>09:00 AM</option>
          <option>10:00 AM</option>
          <option>11:00 AM</option>
          <option>12:00 PM</option>
          <option>01:00 PM</option>
          <option>02:00 PM</option>
          <option>03:00 PM</option>
          <option>04:00 PM</option>
        </select>

        {/* Packages */}
        <div className={styles.packageContainer}>
          {packages.map((pkg) => (
            <div
              key={pkg.id}
              onClick={() => setSelectedPackage(pkg.id)}
              className={`${styles.packageCard} ${
                selectedPackage === pkg.id ? styles.active : ""
              }`}
            >
              <h3>{pkg.price}</h3>
              <p>{pkg.description}</p>
            </div>
          ))}
        </div>

        {/* Submit */}
        <button className={styles.submit}type="submit">Book</button>
      </form>
    </section>
  );
}