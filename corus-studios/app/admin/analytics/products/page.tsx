import type { Metadata } from "next";
import AnalyticsPage from "@/components/AnalyticsPage";

export const metadata: Metadata = {
  title:
    "Product Analytics | Corus Studios",
  description:
    "View store product performance analytics.",
};

export default function ProductAnalyticsPage() {
  return (
    <AnalyticsPage
      type="products"
      eyebrow="Analytics"
      title="Store Analytics"
      description="Track product sales, revenue and your highest-performing store products."
      accentColor="#22c55e"
    />
  );
}