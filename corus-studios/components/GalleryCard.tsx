"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import styles from "./GalleryCard.module.css";
import GallerySkeleton from "./GallerySkeleton";

type GalleryImage = {
  id: number;
  image: string;
  category: string;
};

const categories = [
  "All",
  "Birthday",
  "Graduation",
  "Matriculation",
  "Agenda",
];

// ─── Additional images to load when "View More" is clicked on gallery page ───
const additionalImages: GalleryImage[] = [
  // Add more images here – you can duplicate or create new ones
  { id: 17, image: "/gallery/3.png", category: "Birthday" },
  { id: 18, image: "/gallery/6.png", category: "Graduation" },
  { id: 19, image: "/gallery/7.png", category: "Matriculation" },
  { id: 20, image: "/gallery/10.png", category: "Agenda" },
  { id: 21, image: "/gallery/1.png", category: "Birthday" },
  { id: 22, image: "/gallery/2.png", category: "Graduation" },
  { id: 23, image: "/gallery/4.png", category: "Matriculation" },
  { id: 24, image: "/gallery/5.png", category: "Agenda" },
  { id: 25, image: "/gallery/8.png", category: "Birthday" },
  { id: 26, image: "/gallery/9.png", category: "Graduation" },
];

type GalleryCardProps = {
  isGalleryPage?: boolean; // ← new prop
};

export default function GalleryCard({ isGalleryPage = false }: GalleryCardProps) {
  const router = useRouter();
  const [images, setImages] = useState<GalleryImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [activeCategory, setActiveCategory] = useState("All");
  const [hasLoadedMore, setHasLoadedMore] = useState(false);

  // Initial load
  useEffect(() => {
    const timer = setTimeout(() => {
      setImages([
        { id: 1, image: "/gallery/1.png", category: "Birthday" },
        { id: 2, image: "/gallery/2.png", category: "Birthday" },
        { id: 3, image: "/gallery/3.png", category: "Birthday" },
        { id: 4, image: "/gallery/4.png", category: "Agenda" },
        { id: 5, image: "/gallery/5.png", category: "Graduation" },
        { id: 6, image: "/gallery/6.png", category: "Birthday" },
        { id: 7, image: "/gallery/7.png", category: "Matriculation" },
        { id: 8, image: "/gallery/8.png", category: "Birthday" },
        { id: 9, image: "/gallery/9.png", category: "Graduation" },
        { id: 10, image: "/gallery/10.png", category: "Agenda" },
        { id: 11, image: "/gallery/1.png", category: "Agenda" },
        { id: 12, image: "/gallery/2.png", category: "Agenda" },
        { id: 13, image: "/gallery/4.png", category: "Agenda" },
        { id: 14, image: "/gallery/8.png", category: "Agenda" },
        { id: 15, image: "/gallery/9.png", category: "Agenda" },
        { id: 16, image: "/gallery/5.png", category: "Agenda" },
      ]);
      setLoading(false);
    }, 1800);

    return () => clearTimeout(timer);
  }, []);

  const filteredImages =
    activeCategory === "All"
      ? images
      : images.filter((img) => img.category === activeCategory);

  // ─── Handle "View More" ──────────────────────────────────────────────
  const handleViewMore = () => {
    if (isGalleryPage) {
      // On gallery page: load more images (only once)
      if (!hasLoadedMore && !loadingMore) {
        setLoadingMore(true);
        // Simulate network delay
        setTimeout(() => {
          setImages((prev) => [...prev, ...additionalImages]);
          setHasLoadedMore(true);
          setLoadingMore(false);
        }, 1200);
      }
    } else {
      // On home page: navigate to /gallery
      router.push("/gallery");
    }
  };

  // Hide the button if we're on the gallery page and already loaded more
  const showButton = !(isGalleryPage && hasLoadedMore);

  return (
    <section className={styles.gallerySection} id="gallery">

      {/* FILTERS */}
      <div className={styles.filters}>
        {categories.map((category) => (
          <button
            key={category}
            onClick={() => setActiveCategory(category)}
            className={`${styles.filterButton} ${
              activeCategory === category ? styles.active : ""
            }`}
          >
            {category}
          </button>
        ))}
      </div>

      {/* GALLERY */}
      {loading ? (
        <GallerySkeleton />
      ) : (
        <div className={styles.galleryGrid}>
          {filteredImages.map((image) => (
            <div key={image.id} className={styles.galleryItem}>
              <Image
                src={image.image}
                alt=""
                width={600}
                height={800}
                className={styles.image}
              />
            </div>
          ))}
        </div>
      )}

      {/* BUTTON – shown unless we're on gallery and all extra images loaded */}
      {showButton && (
        <div className={styles.buttonContainer}>
          <button
            className={styles.viewMore}
            onClick={handleViewMore}
            disabled={loadingMore}
          >
            {loadingMore ? "Loading..." : "View More"}
          </button>
        </div>
      )}

    </section>
  );
}