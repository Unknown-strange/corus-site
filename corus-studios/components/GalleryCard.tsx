"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";

import styles from "./GalleryCard.module.css";
import GallerySkeleton from "./GallerySkeleton";
import {
  fetchGalleryContent,
  GALLERY_CATEGORIES,
  type GalleryContentItem,
} from "@/lib/gallery";

type GalleryImage = {
  id: string;
  image: string;
  category: string;
  alt: string;
};

const categories = ["All", ...GALLERY_CATEGORIES];

const HOMEPAGE_PREVIEW_COUNT = 12;

const fallbackImages: GalleryImage[] = [
  { id: "1", image: "/gallery/1.png", category: "Birthday", alt: "Birthday shoot" },
  { id: "2", image: "/gallery/2.png", category: "Birthday", alt: "Birthday shoot" },
  { id: "3", image: "/gallery/3.png", category: "Birthday", alt: "Birthday shoot" },
  { id: "4", image: "/gallery/4.png", category: "Agenda", alt: "Agenda shoot" },
  { id: "5", image: "/gallery/5.png", category: "Graduation", alt: "Graduation shoot" },
  { id: "6", image: "/gallery/6.png", category: "Birthday", alt: "Birthday shoot" },
  { id: "7", image: "/gallery/7.png", category: "Matriculation", alt: "Matriculation shoot" },
  { id: "8", image: "/gallery/8.png", category: "Birthday", alt: "Birthday shoot" },
  { id: "9", image: "/gallery/9.png", category: "Graduation", alt: "Graduation shoot" },
  { id: "10", image: "/gallery/10.png", category: "Agenda", alt: "Agenda shoot" },
  {
    id: "11",
    image: "/gallery/studio.jpg",
    category: "Lifestyle (weddings and funerals)",
    alt: "Lifestyle shoot",
  },
  { id: "12", image: "/gallery/Aunt Vida.jpg", category: "Agenda", alt: "Agenda shoot" },
];

function toGalleryImages(items: GalleryContentItem[]): GalleryImage[] {
  return items.map((item) => ({
    id: item.id,
    image: item.image_url,
    category: item.category || "Agenda",
    alt: item.caption || item.title || "Gallery image",
  }));
}

type GalleryCardProps = {
  isGalleryPage?: boolean;
};

export default function GalleryCard({
  isGalleryPage = false,
}: GalleryCardProps) {
  const router = useRouter();
  const [allImages, setAllImages] = useState<GalleryImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState("All");

  useEffect(() => {
    let cancelled = false;

    async function loadGallery() {
      try {
        const items = await fetchGalleryContent();
        if (!cancelled) {
          const mapped = toGalleryImages(items);
          setAllImages(mapped.length > 0 ? mapped : fallbackImages);
        }
      } catch {
        if (!cancelled) {
          setAllImages(fallbackImages);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadGallery();

    return () => {
      cancelled = true;
    };
  }, []);

  /*
   * =====================================================
   * FILTER
   * =====================================================
   *
   * The API currently doesn't return category.
   *
   * Therefore, until the backend adds category,
   * "All" is the only database-backed filter.
   */

  const filteredImages =
    activeCategory === "All"
      ? allImages
      : allImages.filter((img) => img.category === activeCategory);

  const visibleImages = isGalleryPage
    ? filteredImages
    : filteredImages.slice(0, HOMEPAGE_PREVIEW_COUNT);

  const handleViewMore = () => {
    if (isGalleryPage) {
      return;
    }
    router.push("/gallery");
  };

  const showButton =
    !isGalleryPage && filteredImages.length > HOMEPAGE_PREVIEW_COUNT;

  return (
    <section className={styles.gallerySection} id="gallery">
      <div className={styles.filters}>
        {categories.map((category) => (
          <button
            key={category}
            onClick={() =>
              setActiveCategory(category)
            }
            className={`${styles.filterButton} ${
              activeCategory === category
                ? styles.active
                : ""
            }`}
          >
            {category}
          </button>
        ))}
      </div>

      {loading ? (
        <GallerySkeleton />
      ) : visibleImages.length === 0 ? (
        <p className={styles.emptyState}>No images in this category yet.</p>
      ) : (
        <div className={styles.galleryGrid}>
          {visibleImages.map((image) => (
            <div key={image.id} className={styles.galleryItem}>
              <Image
                src={image.image}
                alt={image.alt}
                width={600}
                height={800}
                className={styles.image}
              />
            </div>
          ))}
        </div>
      )}

      {showButton && (
        <div className={styles.buttonContainer}>
          <button className={styles.viewMore} onClick={handleViewMore}>
            View More
          </button>
        </div>
      )}
    </section>
  );
}
