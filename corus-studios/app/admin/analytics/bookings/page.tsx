import type { Metadata } from "next";
import AnalyticsPage from "@/components/AnalyticsPage";

export const metadata: Metadata = {
  title:
    "Booking Analytics | Corus Studios",
  description:
    "View booking performance analytics.",
};

export default function BookingAnalyticsPage() {
  return (
    <AnalyticsPage
      type="bookings"
      eyebrow="Analytics"
      title="Booking Analytics"
      description="Track booking volume, revenue and top-performing booking types."
      accentColor="#ff5b00"
    />
  );
}