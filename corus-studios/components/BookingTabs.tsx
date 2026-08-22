"use client";

import { useState } from "react";
import {
  CalendarDays,
  Footprints,
} from "lucide-react";

import Booking from "./Booking";
import WalkInBooking from "./WalkInBooking";

import styles from "./BookingTabs.module.css";

type Props = {
  todayIso: string;
};

type BookingMode =
  | "online"
  | "walk-in";

export default function BookingTabs({
  todayIso,
}: Props) {
  const [
    mode,
    setMode,
  ] = useState<BookingMode>(
    "online"
  );

  return (
    <section
      className={
        styles.section
      }
    >
      {/* =====================================================
          PAGE HEADER + TABS
      ===================================================== */}

      <div
        className={
          styles.topArea
        }
      >
        <header
          className={
            styles.header
          }
        >

          <h1
            className={
              styles.heading
            }
          >
            Book a Session
          </h1>

          <p
            className={
              styles.subtitle
            }
          >
            Book online in advance or
            use the walk-in form.
          </p>
        </header>

        {/* =================================================
            TABS
        ================================================= */}

        <div
          className={
            styles.tabs
          }
          role="tablist"
          aria-label="Booking options"
        >
          <button
            type="button"
            role="tab"
            aria-selected={
              mode === "online"
            }
            className={`${styles.tab} ${
              mode === "online"
                ? styles.active
                : ""
            }`}
            onClick={() =>
              setMode(
                "online"
              )
            }
          >
            <CalendarDays
              size={18}
            />

            <span>
              Online Booking
            </span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={
              mode === "walk-in"
            }
            className={`${styles.tab} ${
              mode === "walk-in"
                ? styles.active
                : ""
            }`}
            onClick={() =>
              setMode(
                "walk-in"
              )
            }
          >
            <Footprints
              size={18}
            />

            <span>
              Walk-In Booking
            </span>
          </button>
        </div>
      </div>

      {/* =====================================================
          FULL-WIDTH BOOKING AREA
      ===================================================== */}

      <div
        className={
          styles.content
        }
      >
        {mode ===
        "online" ? (
          <Booking
            todayIso={
              todayIso
            }
          />
        ) : (
          <WalkInBooking
            todayIso={
              todayIso
            }
          />
        )}
      </div>
    </section>
  );
}