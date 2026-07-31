"use client";

import { useState, useEffect } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import Navbar from "@/components/Navbar";
import Map from "@/components/Map";
import Footer from "@/components/Footer";
import styles from "./page.module.css";
import BookingCard from "@/components/BookingCard";

// API response type
type ApiBooking = {
  id: string;
  status: string;
  deposit_amount_ghs: string;
  total_price_ghs: string;
  balance_due_ghs: string;
  paystack_reference: string;
  confirmed_at: string;
  created_at: string;
  session_type_name: string;
  slot_starts_at: string;
  slot_ends_at: string;
  receipt: {
    receipt_number: string;
    amount_ghs: string;
    issued_at: string;
  } | null;
};

// Converted type for BookingCard
type BookingCardData = {
  id: string;
  title: string;
  date: string;
  time: string;
  price: number;
  packageName: string;
  status: string;
};

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default function BookingPage() {
  const [bookings, setBookings] = useState<BookingCardData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchBookings = async () => {
      try {
        const token = localStorage.getItem("access_token");
        if (!token) {
          setError("Please log in to view your bookings.");
          setLoading(false);
          return;
        }

        const response = await fetch(`${API_BASE}/sessions/bookings/me`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          if (response.status === 401) {
            setError("Session expired. Please log in again.");
            setLoading(false);
            return;
          }
          throw new Error("Failed to fetch bookings");
        }

        const data: ApiBooking[] = await response.json();

        // Map API response to BookingCard props
        const mappedBookings: BookingCardData[] = data.map((booking) => {
          // Format date
          const startDate = new Date(booking.slot_starts_at);
          const endDate = new Date(booking.slot_ends_at);

          const dateStr = startDate.toLocaleDateString("en-US", {
            year: "numeric",
            month: "long",
            day: "numeric",
          });

          const timeStr = `${startDate.toLocaleTimeString("en-US", {
            hour: "2-digit",
            minute: "2-digit",
          })} - ${endDate.toLocaleTimeString("en-US", {
            hour: "2-digit",
            minute: "2-digit",
          })}`;

          // Parse price from total_price_ghs (handles decimal strings)
          const price = parseFloat(booking.total_price_ghs) || 0;

          // Use session_type_name as title, or fallback
          const title = booking.session_type_name || "Session";

          // Use status as package name, or fallback
          const packageName = booking.status 
            ? booking.status.charAt(0).toUpperCase() + booking.status.slice(1) 
            : "Confirmed";

          return {
            id: booking.id,
            title,
            date: dateStr,
            time: timeStr,
            price,
            packageName,
            status: booking.status,
          };
        });

        setBookings(mappedBookings);
        setError(null);
      } catch (err) {
        console.error(err);
        setError("Failed to load bookings.");
      } finally {
        setLoading(false);
      }
    };

    fetchBookings();
  }, []);

  if (loading) {
    return (
      <>
        <Navbar />
        <div className={styles.page}>
          <div className={styles.container}>
            <h1 className={styles.heading}>My Bookings</h1>
            <p className={styles.subheading}>Loading your bookings...</p>
          </div>
        </div>
        <Map />
        <Footer />
      </>
    );
  }

  if (error) {
    return (
      <>
        <Navbar />
        <div className={styles.page}>
          <div className={styles.container}>
            <h1 className={styles.heading}>My Bookings</h1>
            <p className={styles.subheading} style={{ color: "#dc3545" }}>
              {error}
            </p>
          </div>
        </div>
        <Map />
        <Footer />
      </>
    );
  }

  return (
    <>
      <Navbar />
      <div className={styles.page}>
        <div className={styles.container}>
          <h1 className={styles.heading}>My Bookings</h1>
          <p className={styles.subheading}>
            View and manage your upcoming sessions
          </p>

          <div className={styles.bookingsList}>
            {bookings.length === 0 ? (
              <p className={styles.emptyState}>No bookings found. Book a session today!</p>
            ) : (
              bookings.map((booking) => (
                <BookingCard
                  key={booking.id}
                  title={booking.title}
                  date={booking.date}
                  time={booking.time}
                  price={booking.price}
                  packageName={booking.packageName}
                />
              ))
            )}
          </div>
        </div>
      </div>
      <Map />
      <Footer />
    </>
  );
}