import type { Metadata } from "next";
import Navbar from "@/components/Navbar";
import StoreScreen from "@/components/StoreScreen";
import Map from "@/components/Map";
import Footer from "@/components/Footer";

export const metadata: Metadata = {
  title: "Store | Corus Studios",
  description: "Buy photography gadgets from Corus Studios.",
};

export default function StorePage() {
  return (
    <>
      <Navbar />
      <StoreScreen />
      <Map />
      <Footer />
    </>
  );
}
