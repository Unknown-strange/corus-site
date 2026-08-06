"use client";

import { useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import NavbarAdmin from "@/components/NavbarAdmin";
import Footer from "@/components/Footer";
import styles from "./page.module.css";

export const dynamic = "force-dynamic";

export default function AddUnavailableDatePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const type = searchParams.get("type") || "rental";

  const [date, setDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const payload = {
      date,
      startTime, // in 24‑hour format (HH:MM)
      endTime,   // in 24‑hour format (HH:MM)
      type,
    };

    console.log("Submitting unavailable date:", payload);

    setTimeout(() => {
      setLoading(false);
      router.push("/admin/Manage/booking/packages");
    }, 1000);
  };

  return (
    <>
      <NavbarAdmin />

      <main className={styles.page}>
        <section className={styles.header}>
          <button
            className={styles.backButton}
            onClick={() => router.push("/admin/Manage/booking/date")}
          >
            <ArrowLeft size={24} />
          </button>
          <h1>ADD DATE</h1>
        </section>

        <section className={styles.body}>
          <form className={styles.form} onSubmit={handleSubmit}>
            {/* Date */}
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className={styles.input}
              required
            />

            {/* Start Time */}
            <div className={styles.timeWrapper}>
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className={styles.input}
                required
              />
              <span className={styles.timeHint}>24‑hour format (e.g., 14:30 for 2:30 PM)</span>
            </div>

            {/* End Time */}
            <div className={styles.timeWrapper}>
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className={styles.input}
                required
              />
              <span className={styles.timeHint}>24‑hour format (e.g., 16:45 for 4:45 PM)</span>
            </div>

            <button type="submit" className={styles.saveButton} disabled={loading}>
              {loading ? "Saving..." : "Save"}
            </button>
          </form>
        </section>
      </main>

      <Footer />
    </>
  );
}