import Navbar from "@/components/Navbar";
import Gallery from "@/components/Gallery";
import GalleryCard from "@/components/GalleryCard";
import Map from "@/components/Map";
import Footer from "@/components/Footer";

export default function GalleryPage() {
  return (
    <section>
      <Navbar />
      <Gallery />
      <GalleryCard isGalleryPage={true} /> {/* ← pass prop */}
      <Map />
      <Footer />
    </section>
  );
}