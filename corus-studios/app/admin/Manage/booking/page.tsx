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
          <h1 className={styles.heading}>MANAGE BOOKINGS</h1>

          <div className={styles.grid}>
            {/* Rentals Card - passes category=rentals */}
            <Link href="booking/packages" className={styles.card}>
              <div className={styles.cardContent}>
                <h2 className={styles.cardTitle}>Manage Packages</h2>
                <span className={styles.cardArrow}>›</span>
              </div>
            </Link>

            {/* Store Card - passes category=store */}
            <Link href="booking/date" className={styles.card}>
              <div className={styles.cardContent}>
                <h2 className={styles.cardTitle}>Manage Dates</h2>
                <span className={styles.cardArrow}>›</span>
              </div>
            </Link>

                        {/* Store Card - passes category=store */}
            <Link href="booking/shoots" className={styles.card}>
              <div className={styles.cardContent}>
                <h2 className={styles.cardTitle}>Manage your Shoots</h2>
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