import type { Metadata } from "next";

import Navbar from "@/components/Navbar";
import Booking from "@/components/Booking";
import Map from "@/components/Map";
import Footer from "@/components/Footer";

export const metadata: Metadata = {
  title:
    "Book a Session | Corus Studios",
  description:
    "Book a photography session at Corus Studios.",
};

function getTodayIso() {
  const now =
    new Date();

  const year =
    now.getFullYear();

  const month =
    String(
      now.getMonth() + 1
    ).padStart(
      2,
      "0"
    );

  const day =
    String(
      now.getDate()
    ).padStart(
      2,
      "0"
    );

  return `${year}-${month}-${day}`;
}

export default function BookingSessionPage() {
  const todayIso =
    getTodayIso();

  return (
    <>
      <Navbar />

      <main>
        <Booking
          todayIso={
            todayIso
          }
        />
      </main>

      <Map />

      <Footer />
    </>
  );
}