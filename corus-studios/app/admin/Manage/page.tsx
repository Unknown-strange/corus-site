import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import NavbarAdmin from "@/components/NavbarAdmin";
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
      <NavbarAdmin />
      <div className={styles.page}>
        <div className={styles.container}>
          <h1 className={styles.heading}>MANAGE</h1>

          <div className={styles.grid}>
            {/* Rentals Card - passes category=rentals */}
            <Link href="Manage/rentals" className={styles.card}>
              <div className={styles.cardContent}>
                <h2 className={styles.cardTitle}>Manage Rentals</h2>
                <span className={styles.cardArrow}>›</span>
              </div>
            </Link>

            {/* Store Card - passes category=store */}
            <Link href="Manage/store" className={styles.card}>
              <div className={styles.cardContent}>
                <h2 className={styles.cardTitle}>Manage your store</h2>
                <span className={styles.cardArrow}>›</span>
              </div>
            </Link>

                        {/* Store Card - passes category=store */}
            <Link href="Manage/booking" className={styles.card}>
              <div className={styles.cardContent}>
                <h2 className={styles.cardTitle}>Manage your Bookings</h2>
                <span className={styles.cardArrow}>›</span>
              </div>
            </Link>

            
          </div>
        </div>
      </div>
      <Footer />
    </>
  );
}