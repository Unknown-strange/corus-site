import type { Metadata } from "next";
import Link from "next/link";
import {
  Package,
  CalendarDays,
  ArrowRight,
  ArrowLeft,
} from "lucide-react";

import NavbarAdmin from "@/components/NavbarAdmin";
import Footer from "@/components/Footer";

import styles from "./page.module.css";

export const metadata: Metadata = {
  title: "Manage Bookings | Corus Studios",
  description:
    "Manage booking packages and unavailable dates at Corus Studios.",
};

export default function ManageBookingsPage() {
  return (
    <>
      <NavbarAdmin />

      <main className={styles.page}>
        <div className={styles.container}>

          <section className={styles.hero}>
            <Link
              href="/admin/Manage"
              className={styles.backButton}
              aria-label="Go back to manage"
            >
              <ArrowLeft size={20} />
            </Link>

            <div className={styles.heroContent}>
              <span className={styles.eyebrow}>
                Booking Management
              </span>

              <h1 className={styles.heading}>
                Manage bookings
              </h1>

              <p className={styles.subtitle}>
                Configure the packages customers can
                book and control when the studio is
                available.
              </p>
            </div>
          </section>

          <section className={styles.grid}>

            <Link
              href="/admin/Manage/booking/packages"
              className={styles.card}
            >
              <div
                className={`${styles.iconWrapper} ${styles.orange}`}
              >
                <Package size={25} />
              </div>

              <div className={styles.cardContent}>
                <span className={styles.cardEyebrow}>
                  Booking Packages
                </span>

                <h2 className={styles.cardTitle}>
                  Manage Packages
                </h2>

                <p className={styles.cardDescription}>
                  Create, edit and remove the
                  photography packages available
                  to your customers.
                </p>
              </div>

              <div className={styles.arrow}>
                <ArrowRight size={20} />
              </div>
            </Link>

            <Link
              href="/admin/Manage/booking/date"
              className={styles.card}
            >
              <div
                className={`${styles.iconWrapper} ${styles.blue}`}
              >
                <CalendarDays size={25} />
              </div>

              <div className={styles.cardContent}>
                <span className={styles.cardEyebrow}>
                  Availability
                </span>

                <h2 className={styles.cardTitle}>
                  Manage Dates
                </h2>

                <p className={styles.cardDescription}>
                  Block dates and time periods when
                  the studio is unavailable for
                  customer bookings.
                </p>
              </div>

              <div className={styles.arrow}>
                <ArrowRight size={20} />
              </div>
            </Link>

          </section>
        </div>
      </main>

      <Footer />
    </>
  );
}