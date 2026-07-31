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

type Props = {
  searchParams: Promise<{ category?: string }>;
};

export default async function CartsPage({ searchParams }: Props) {
  const { category } = await searchParams;
  const selectedCategory = category || "store";
  const displayName = selectedCategory.charAt(0).toUpperCase() + selectedCategory.slice(1);

  return (
    <section className={styles.section}>
      <Navbar />
      <CartFilter cartLabel={displayName} />
      <Cart category={selectedCategory} />
      <Map />
      <Footer />
    </section>
  );
}