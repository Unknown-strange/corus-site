import type { Metadata } from "next";
import Navbar from "@/components/Navbar";
import MyRequests from "@/components/MyRequests";
import Map from "@/components/Map";
import Footer from "@/components/Footer";

export const metadata: Metadata = {
  title: "My Requests | Corus Studios",
  description: "Track the status of your Corus Studios studio requests.",
};

export default function MyRequestsPage() {
  return (
    <>
      <Navbar />
      <MyRequests />
      <Map />
      <Footer />
    </>
  );
}
