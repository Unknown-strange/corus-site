"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Plus, Trash2 } from "lucide-react"; // ← removed Edit
import NavbarAdmin from "@/components/NavbarAdmin";
import Footer from "@/components/Footer";
import styles from "./page.module.css";

type UnavailableDateItem = {
  id: string;
  date: string;
  time: string;
};

const mockDates: UnavailableDateItem[] = [
  { id: "1", date: "12/07/2026", time: "10am - 12pm" },
  { id: "2", date: "12/07/2026", time: "10am - 12pm" },
  { id: "3", date: "12/07/2026", time: "10am - 12pm" },
];

export default function UnavailableDatesAdmin() {
  const [dates, setDates] = useState<UnavailableDateItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setTimeout(() => {
      setDates(mockDates);
      setLoading(false);
    }, 600);
  }, []);

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this unavailable date?")) {
      setDates(dates.filter((item) => item.id !== id));
      // TODO: API call to delete
    }
  };

  return (
    <>
      <NavbarAdmin />
      <div className={styles.page}>
        <div className={styles.container}>
          <h1 className={styles.heading}>UNAVAILABLE DATES</h1>

          {loading ? (
            <div className={styles.loading}>Loading dates...</div>
          ) : (
            <>
              <div className={styles.grid}>
                {dates.map((item) => (
                  <div key={item.id} className={styles.card}>
                    <div className={styles.cardContent}>
                      {/* Left: Date + Time (in a row) */}
                      <div className={styles.info}>
                        <span className={styles.date}>{item.date}</span>
                        <span className={styles.time}>{item.time}</span>
                      </div>

                      {/* Right: Delete icon only */}
                      <div className={styles.actions}>
                        <button
                          className={styles.deleteButton}
                          onClick={() => handleDelete(item.id)}
                          aria-label="Delete unavailable date"
                        >
                          <Trash2 size={20} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Add button */}
              <div className={styles.addButtonWrapper}>
                <Link href="./date/add" className={styles.addButton}>
                  <Plus size={20} />
                  Add Date
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
      <Footer />
    </>
  );
}