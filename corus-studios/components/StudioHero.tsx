import Image from "next/image";
import Link from "next/link";
import styles from "./StudioHero.module.css";

/**
 * Studio-space half of the rentals page. "Rent Now" opens the studio request
 * form at /rentals/studio, which posts to the reservations API.
 */
export default function StudioHero() {
  return (
    <section className={styles.hero}>
      <Image
        src="/gallery/studio.jpg"
        alt=""
        fill
        sizes="100vw"
        className={styles.image}
        priority
      />

      <h2 className={styles.title}>
        Rent a Studio
        <br />
        for your Shoots
      </h2>

      <Link href="/rentals/studio" className={styles.cta}>
        Rent Now
      </Link>
    </section>
  );
}
