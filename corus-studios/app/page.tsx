import Hero from "@/components/Hero";
import Navbar from "@/components/Navbar";
import Gallery from "@/components/Gallery";
import GalleryCard from "@/components/GalleryCard";
import Booking from "@/components/Booking";
import styles from "./page.module.css";
import Map from "@/components/Map";
import Footer from "@/components/Footer";

export default function Home() {
  return (
    <section className={styles.bodyMain}>
      <div className="heroWrapper">
      <Hero />
      </div>
      <Navbar />
      <Gallery />
      <GalleryCard />
      <Booking />
      /<Map/>
      <Footer />
    </section>
  );
}