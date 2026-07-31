import type { Metadata } from "next";
import Navbar from "@/components/Navbar";
import Checkout from "@/components/Checkout";
import Map from "@/components/Map";
import Footer from "@/components/Footer";

export const metadata: Metadata = {
  title: "Checkout | Corus Studios",
  description: "Review your Corus Studios cart and proceed to payment.",
};

export default function CheckoutPage() {
  return (
    <>
      <Navbar />
      <Checkout />
      <Map />
      <Footer />
    </>
  );
}
