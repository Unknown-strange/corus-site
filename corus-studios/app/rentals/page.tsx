import type { Metadata } from "next";
import Navbar from "@/components/Navbar";
import RentalsScreen from "@/components/RentalsScreen";

export const metadata: Metadata = {
  title: "Rentals | Corus Studios",
  description: "Rent studio space and photography gadgets from Corus Studios.",
};

export default function RentalsPage() {
  return (
    <>
      <Navbar />
      <RentalsScreen />
    </>
  );
}
