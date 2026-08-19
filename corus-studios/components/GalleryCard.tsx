"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";

import styles from "./GalleryCard.module.css";
import GallerySkeleton from "./GallerySkeleton";

type GalleryImage = {
  id: string;
  section: string;
  title: string;
  body: string;
  image_url: string;
  caption: string;
  sort_order: number;
};

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:8000";

const categories = [
  "All",
  "Birthday",
  "Graduation",
  "Matriculation",
  "Agenda",
];

type GalleryCardProps = {
  isGalleryPage?: boolean;
};

export default function GalleryCard({
  isGalleryPage = false,
}: GalleryCardProps) {
  const router = useRouter();

  const [images, setImages] =
    useState<GalleryImage[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [activeCategory, setActiveCategory] =
    useState("All");

  /*
   * =====================================================
   * LOAD GALLERY FROM PUBLIC API
   * =====================================================
   */

  useEffect(() => {
    const fetchGallery = async () => {
      try {
        setLoading(true);

        const response = await fetch(
          `${API_BASE}/catalog/content/gallery`,
          {
            method: "GET",
            cache: "no-store",
          }
        );

        if (!response.ok) {
          throw new Error(
            "Failed to fetch gallery."
          );
        }

        const data: GalleryImage[] =
          await response.json();

        /*
         * Make sure the database ordering is respected.
         */

        const sorted = [...data].sort(
          (a, b) =>
            a.sort_order - b.sort_order
        );

        setImages(sorted);
      } catch (error) {
        console.error(
          "Gallery loading error:",
          error
        );

        setImages([]);
      } finally {
        setLoading(false);
      }
    };

    fetchGallery();
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
      ? images
      : images;

  /*
   * =====================================================
   * VIEW MORE
   * =====================================================
   */

  const handleViewMore = () => {
    if (!isGalleryPage) {
      router.push("/gallery");
    }
  };

  return (
    <section
      className={styles.gallerySection}
      id="gallery"
    >
      {/* FILTERS */}

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

      {/* GALLERY */}

      {loading ? (
        <GallerySkeleton />
      ) : images.length === 0 ? (
        <div className={styles.empty}>
          No gallery images available.
        </div>
      ) : (
        <div className={styles.galleryGrid}>
          {filteredImages.map((image) => (
            <div
              key={image.id}
              className={styles.galleryItem}
            >
              <Image
                src={image.image_url}
                alt={
                  image.caption ||
                  image.title ||
                  "Gallery image"
                }
                width={600}
                height={800}
                className={styles.image}
              />
            </div>
          ))}
        </div>
      )}

      {/* VIEW MORE */}

      {!isGalleryPage &&
        !loading &&
        images.length > 0 && (
          <div
            className={styles.buttonContainer}
          >
            <button
              className={styles.viewMore}
              onClick={handleViewMore}
            >
              View More
            </button>
          </div>
        )}
    </section>
  );
}