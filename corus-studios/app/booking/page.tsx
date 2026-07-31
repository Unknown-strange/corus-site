import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import Navbar from "@/components/Navbar";
import Map from "@/components/Map";
import Footer from "@/components/Footer";
import styles from "./page.module.css";
import BookingCard from "@/components/BookingCard";

export const metadata: Metadata = {
  title: "My Bookings | Corus Studios",
  description: "View your bookings at Corus Studios.",
};

// Dummy data for bookings
const dummyBookings = [
  {
    id: 1,
    title: "Studio Session",
    date: "December 15, 2026",
    time: "10:00 AM - 12:00 PM",
    price: 250,
    packageName: "Gold Package",
  },
  {
    id: 2,
    title: "Outdoor Photoshoot",
    date: "December 18, 2026",
    time: "2:00 PM - 4:30 PM",
    price: 180,
    packageName: "Silver Package",
  },
  {
    id: 3,
    title: "Event Coverage",
    date: "December 22, 2026",
    time: "9:00 AM - 6:00 PM",
    price: 450,
    packageName: "Platinum Package",
  },
  {
    id: 4,
    title: "Portrait Session",
    date: "January 5, 2027",
    time: "11:00 AM - 1:00 PM",
    price: 120,
    packageName: "Basic Package",
  },
];

export default function BookingPage() {
  return (
    <>
      <Navbar />
      <div className={styles.page}>
        <div className={styles.container}>
          <h1 className={styles.heading}>My Bookings</h1>
          <p className={styles.subheading}>View and manage your upcoming sessions</p>

          <div className={styles.bookingsList}>
            {dummyBookings.map((booking) => (
              <BookingCard
                key={booking.id}
                title={booking.title}
                date={booking.date}
                time={booking.time}
                price={booking.price}
                packageName={booking.packageName}
              />
            ))}
          </div>
        </div>
      </div>
      <Map />
      <Footer />
    </>
  );
}