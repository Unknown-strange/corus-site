import type { Metadata } from "next";

import Navbar from "@/components/Navbar";
import Map from "@/components/Map";
import Footer from "@/components/Footer";

import Cart from "@/components/Cart";
import CartFilter from "@/components/CartFilter";

import styles from "./page.module.css";

export const metadata: Metadata = {
  title: "Cart | Corus Studios",
  description:
    "View your Corus Studios rentals and store items.",
};

type Props = {
  searchParams: Promise<{
    category?: string;
  }>;
};

export default async function CartsPage({
  searchParams,
}: Props) {
  const { category } =
    await searchParams;

  const selectedCategory =
    category === "rentals"
      ? "rentals"
      : "store";

  const displayName =
    selectedCategory
      .charAt(0)
      .toUpperCase() +
    selectedCategory.slice(1);

  return (
    <section
      className={
        styles.section
      }
    >
      <Navbar />

      <CartFilter
        cartLabel={displayName}
      />

      <Cart
        category={
          selectedCategory
        }
      />

      <Map />

      <Footer />
    </section>
  );
}