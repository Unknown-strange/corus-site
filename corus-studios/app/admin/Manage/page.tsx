import type { Metadata } from "next";
import Link from "next/link";
import {
  Camera,
  ShoppingBag,
  CalendarDays,
  Images,
  ArrowRight,
} from "lucide-react";

import NavbarAdmin from "@/components/NavbarAdmin";
import Footer from "@/components/Footer";

import styles from "./page.module.css";

export const metadata: Metadata = {
  title: "Manage | Corus Studios",
  description:
    "Manage rentals, store products, bookings, and gallery.",
};

const managementCards = [
  {
    title: "Manage Rentals",
    eyebrow: "Equipment",
    description:
      "Add, update and monitor the equipment available for rental.",
    href: "/admin/Manage/rentals",
    icon: Camera,
    accent: "orange",
  },

  {
    title: "Manage Store",
    eyebrow: "Products",
    description:
      "Control products, inventory and purchases from your store.",
    href: "/admin/Manage/store",
    icon: ShoppingBag,
    accent: "green",
  },

  {
    title: "Manage Bookings",
    eyebrow: "Appointments",
    description:
      "Configure packages, availability and customer bookings.",
    href: "/admin/Manage/booking",
    icon: CalendarDays,
    accent: "blue",
  },

  {
    title: "Manage Gallery",
    eyebrow: "Website Content",
    description:
      "Upload, organize and control the images shown on the homepage.",
    href: "/admin/Manage/gallery",
    icon: Images,
    accent: "purple",
  },
];

export default function ManagePage() {
  return (
    <>
      <NavbarAdmin />

      <main className={styles.page}>
        <div className={styles.container}>

          {/* =================================================
              HEADER
          ================================================= */}

          <section className={styles.hero}>

            <div className={styles.heroContent}>
              <span className={styles.badge}>
                Admin Panel
              </span>

              <h1 className={styles.heading}>
                Manage
              </h1>

              <p className={styles.subheading}>
                Manage every part of your studio
                operations from one place.
              </p>
            </div>

            <div className={styles.heroDecoration}>
              <span />
              <span />
              <span />
            </div>

          </section>

          {/* =================================================
              MANAGEMENT GRID
          ================================================= */}

          <section className={styles.grid}>
            {managementCards.map((item) => {
              const Icon = item.icon;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={styles.card}
                >

                  <div
                    className={`${styles.iconWrapper} ${
                      styles[item.accent]
                    }`}
                  >
                    <Icon
                      size={25}
                      strokeWidth={2}
                    />
                  </div>

                  <div className={styles.content}>
                    <span
                      className={
                        styles.cardEyebrow
                      }
                    >
                      {item.eyebrow}
                    </span>

                    <h2
                      className={
                        styles.cardTitle
                      }
                    >
                      {item.title}
                    </h2>

                    <p
                      className={
                        styles.cardDescription
                      }
                    >
                      {item.description}
                    </p>
                  </div>

                  <div className={styles.arrow}>
                    <ArrowRight size={19} />
                  </div>

                </Link>
              );
            })}
          </section>

        </div>
      </main>

      <Footer />
    </>
  );
}