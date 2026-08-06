"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import NavbarAdmin from "@/components/NavbarAdmin";
import Footer from "@/components/Footer";
import styles from "./page.module.css";

type BookingItem = {
  id: string;
  customerName: string;
  bookingType: string;
  phoneNumber: string;   // ← added
  date: string;          // ← added
  time: string;          // ← added
};

const mockBookings: BookingItem[] = [
  {
    id: "1",
    customerName: "Patience Amevor Mensah",
    bookingType: "Birthday Shoot",
    phoneNumber: "+233 234 5678 90",
    date: "12/07/2026",
    time: "10am - 2pm",
  },
  {
    id: "2",
    customerName: "Agyemang Yaw Takyi",
    bookingType: "Graduation Shoot",
    phoneNumber: "+233 234 5678 90",
    date: "12/07/2026",
    time: "10am - 2pm",
  },
  {
    id: "3",
    customerName: "Akatey Collins",
    bookingType: "Matriculation Shoot",
    phoneNumber: "+233 234 5678 90",
    date: "12/07/2026",
    time: "10am - 2pm",
  },
];

export default function BookingsAdmin() {
  const [bookings, setBookings] = useState<BookingItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setTimeout(() => {
      setBookings(mockBookings);
      setLoading(false);
    }, 600);
  }, []);

  return (
    <>
      <NavbarAdmin />
      <div className={styles.page}>
        <div className={styles.container}>
          <h1 className={styles.heading}>MANAGE YOUR BOOKINGS</h1>

          {loading ? (
            <div className={styles.loading}>Loading bookings...</div>
          ) : (
            <div className={styles.grid}>
              {bookings.map((booking) => (
                <Link
                  key={booking.id}
                  href={`/admin/Bookings/${booking.id}`}
                  className={styles.card}
                >
                  <div className={styles.cardContent}>
                    <div className={styles.info}>
                      <h3 className={styles.cardTitle}>{booking.customerName}</h3>
                      <span className={styles.bookingType}>{booking.bookingType}</span>
                    </div>
                    <span className={styles.cardArrow}>›</span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
      <Footer />
    </>
  );
}