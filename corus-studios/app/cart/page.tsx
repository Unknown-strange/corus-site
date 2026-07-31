import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import Navbar from "@/components/Navbar";
import Map from "@/components/Map";
import Footer from "@/components/Footer";
import styles from "./page.module.css";

export const metadata: Metadata = {
  title: "My Cart | Corus Studios",
  description: "View your cart items at Corus Studios.",
};

export default function CartPage() {
  return (
    <>
      <Navbar />
      <div className={styles.page}>
        <div className={styles.container}>
          <h1 className={styles.heading}>My Cart</h1>
          <p className={styles.subheading}>Select a category to view your items</p>

          <div className={styles.grid}>
            {/* Rentals Card - passes category=rentals */}
            <Link href="/cart/carts?category=rentals" className={styles.card}>
              <div className={styles.cardContent}>
                <h2 className={styles.cardTitle}>Rentals</h2>
                <p className={styles.cardDesc}>View your rented gadgets and equipment</p>
                <span className={styles.cardArrow}>›</span>
              </div>
            </Link>

            {/* Store Card - passes category=store */}
            <Link href="/cart/carts?category=store" className={styles.card}>
              <div className={styles.cardContent}>
                <h2 className={styles.cardTitle}>Store</h2>
                <p className={styles.cardDesc}>View your store purchases and merchandise</p>
                <span className={styles.cardArrow}>›</span>
              </div>
            </Link>
          </div>
        </div>
      </div>
      <Map />
      <Footer />
    </>
  );
}