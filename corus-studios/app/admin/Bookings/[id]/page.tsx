"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import NavbarAdmin from "@/components/NavbarAdmin";
import Footer from "@/components/Footer";
import styles from "./page.module.css";

// Same type as the list page
type BookingItem = {
  id: string;
  customerName: string;
  bookingType: string;
  phoneNumber: string;
  date: string;
  time: string;
};

// Same mock data (in a real app, you'd fetch from an API)
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

export default function BookingDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;

  const [booking, setBooking] = useState<BookingItem | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulate API fetch
    setTimeout(() => {
      const found = mockBookings.find((b) => b.id === id);
      setBooking(found || null);
      setLoading(false);
    }, 400);
  }, [id]);

  if (loading) {
    return (
      <>
        <NavbarAdmin />
        <div className={styles.page}>
          <div className={styles.container}>
            <div className={styles.loading}>Loading booking details...</div>
          </div>
        </div>
        <Footer />
      </>
    );
  }

  if (!booking) {
    return (
      <>
        <NavbarAdmin />
        <div className={styles.page}>
          <div className={styles.container}>
            <div className={styles.notFound}>Booking not found.</div>
          </div>
        </div>
        <Footer />
      </>
    );
  }

  return (
    <>
      <NavbarAdmin />
      <div className={styles.page}>
        <div className={styles.container}>
          {/* Back button */}
          <button
            className={styles.backButton}
            onClick={() => router.push("/admin/Manage/booking")}
          >
            <ArrowLeft size={24} />
          </button>

          <h1 className={styles.heading}>Booking Details</h1>

          <div className={styles.detailsCard}>
            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>Type of shoot:</span>
              <span className={styles.detailValue}>{booking.bookingType}</span>
            </div>

            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>Name:</span>
              <span className={styles.detailValue}>{booking.customerName}</span>
            </div>

            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>Phone Number:</span>
              <span className={styles.detailValue}>{booking.phoneNumber}</span>
            </div>

            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>Date:</span>
              <span className={styles.detailValue}>{booking.date}</span>
            </div>

            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>Time:</span>
              <span className={styles.detailValue}>{booking.time}</span>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </>
  );
}