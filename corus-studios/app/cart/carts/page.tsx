import type { Metadata } from "next";
import Navbar from "@/components/Navbar";
import Cart from "@/components/Cart";
import Map from "@/components/Map";
import Footer from "@/components/Footer";
import styles from "./page.module.css";
import CartFilter from "@/components/CartFilter";

export const metadata: Metadata = {
  title: "Cart | Corus Studios",
  description: "Rent studio space and photography gadgets from Corus Studios.",
};

export default function CartsPage() {
  return (  
    <section className={styles.section}>
      <Navbar />
      <CartFilter />
      <Cart />
      <Map />
      <Footer />
    </section>
  );
}
