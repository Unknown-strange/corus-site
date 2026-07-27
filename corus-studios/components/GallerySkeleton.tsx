import styles from "./GalleryCard.module.css";

const skeletonHeights = [
  320,
  420,
  250,
  180,
  280,
  340,
  240,
  300,
  380,
  210,
  160,
  260,
];

export default function GallerySkeleton() {
  return (
    <div className={styles.galleryGrid}>
      {skeletonHeights.map((height, index) => (
        <div
          key={index}
          className={styles.galleryItem}
        >
          <div
            className={styles.skeleton}
            style={{ height: `${height}px` }}
          />
        </div>
      ))}
    </div>
  );
}