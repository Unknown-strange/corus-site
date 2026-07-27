"use client";

import { Folder } from "lucide-react";
import styles from "./Gallery.module.css";


export default function Gallery() {
  const handleFolderClick = (folderName: string) => {
    alert(`Opening folder: ${folderName}`);
    // Here you can navigate to a gallery detail page, open a modal, etc.
  };

  return (
    <section className={styles.gallery}>
      <div className={styles.container}>
        <h2 className={styles.title}>OUR GALLERY</h2>
        <p className={styles.description}>
          A Collection of Our Work. Click on each folder to view more
        </p>
      </div>
    </section>
  );
}