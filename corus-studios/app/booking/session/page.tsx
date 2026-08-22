import type { Metadata } from "next";

import Navbar from "@/components/Navbar";
import BookingTabs from "@/components/BookingTabs";
import Map from "@/components/Map";
import Footer from "@/components/Footer";

export const metadata: Metadata = {
  title:
    "Book a Session | Corus Studios",

  description:
    "Book a photography session online or create a walk-in booking at Corus Studios.",
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
        <BookingTabs
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