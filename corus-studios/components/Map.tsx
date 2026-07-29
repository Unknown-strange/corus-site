"use client";

import styles from "./Map.module.css";

interface MapProps {
  location?: string; // e.g., "Accra, Ghana" or "5.6037,-0.1870"
  width?: string;
  height?: string;
}

export default function Map({
  location = "Accra, Ghana",
  width = "100%",
  height = "400px",
}: MapProps) {
  // Encode the location for the embed URL
  const encodedLocation = encodeURIComponent(location);

  return (
    <div className={styles.mapContainer} style={{ width, height }}>
      <iframe
        className={styles.mapIframe}
        src="https://maps.google.com/maps?q=Corus+Studios+and+Business+Center%2C+MCFQ%2B476%2C+Kumasi&output=embed"
        allowFullScreen
        loading="lazy"
        title="Google Map"
      />
    </div>
  );
}