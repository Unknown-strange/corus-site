import type { Metadata } from "next";
import Link from "next/link";
import {
  ShoppingBag,
  Camera,
  ArrowRight,
} from "lucide-react";

import Navbar from "@/components/Navbar";
import Map from "@/components/Map";
import Footer from "@/components/Footer";

import styles from "./page.module.css";

export const metadata: Metadata = {
  title: "My Cart | Corus Studios",
  description:
    "View your rentals and store items at Corus Studios.",
};

export default function CartPage() {
  return (
    <>
      <Navbar />

      <main className={styles.page}>
        <div className={styles.container}>
          {/* =================================================
              HEADER
          ================================================= */}

          <section className={styles.header}>
            <span className={styles.eyebrow}>
              Corus Studio
            </span>

            <h1 className={styles.heading}>
              My Cart
            </h1>

            <p className={styles.subheading}>
              Select what you would like to
              view from your Corus Studio cart.
            </p>
          </section>

          {/* =================================================
              CATEGORY CARDS
          ================================================= */}

          <section className={styles.grid}>
            {/* RENTALS */}

            <Link
              href="/cart/carts?category=rentals"
              className={styles.card}
            >
              <div
                className={`${styles.iconWrapper} ${styles.orange}`}
              >
                <Camera size={25} />
              </div>

              <div className={styles.cardContent}>
                <span className={styles.cardEyebrow}>
                  Equipment
                </span>

                <h2 className={styles.cardTitle}>
                  Rentals
                </h2>

                <p className={styles.cardDesc}>
                  View your rented gadgets and
                  photography equipment.
                </p>
              </div>

              <div className={styles.arrow}>
                <ArrowRight size={20} />
              </div>
            </Link>

            {/* STORE */}

            <Link
              href="/cart/carts?category=store"
              className={styles.card}
            >
              <div
                className={`${styles.iconWrapper} ${styles.blue}`}
              >
                <ShoppingBag size={25} />
              </div>

              <div className={styles.cardContent}>
                <span className={styles.cardEyebrow}>
                  Shopping
                </span>

                <h2 className={styles.cardTitle}>
                  Store
                </h2>

                <p className={styles.cardDesc}>
                  View your store purchases and
                  merchandise.
                </p>
              </div>

              <div className={styles.arrow}>
                <ArrowRight size={20} />
              </div>
            </Link>
          </section>
        </div>
      </main>

      <Map />

      <Footer />
    </>
  );
}