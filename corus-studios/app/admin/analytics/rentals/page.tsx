import type { Metadata } from "next";
import AnalyticsPage from "@/components/AnalyticsPage";

export const metadata: Metadata = {
  title:
    "Rental Analytics | Corus Studios",
  description:
    "View rental performance analytics.",
};

export default function RentalAnalyticsPage() {
  return (
    <AnalyticsPage
      type="rentals"
      eyebrow="Analytics"
      title="Rental Analytics"
      description="Track rental activity, revenue and your most-used equipment."
      accentColor="#2563eb"
    />
  );
}