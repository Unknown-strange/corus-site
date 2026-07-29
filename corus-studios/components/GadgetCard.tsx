import Image from "next/image";
import Link from "next/link";
import type { Gadget } from "@/lib/gadgets";
import styles from "./GadgetCard.module.css";

/**
 * Template card for one rentable gadget.
 *
 * Props mirror `RentEquipmentPublicResponse` from `GET /rentals/equipment`, so
 * feeding it live admin-uploaded stock later needs no changes here. Out of
 * stock (`stock === 0`) renders the design's "Not Available" state.
 */
export default function GadgetCard({ gadget }: { gadget: Gadget }) {
  const available = gadget.stock > 0;

  return (
    <article className={`${styles.card} ${available ? "" : styles.cardUnavailable}`}>
      {available ? null : <span className={styles.badge}>Not Available</span>}

      <div className={styles.imageWrap}>
        <Image
          src={gadget.image_url}
          alt={gadget.name}
          fill
          sizes="(max-width: 40rem) 50vw, (max-width: 64rem) 33vw, 25vw"
          className={styles.image}
        />
      </div>

      <h3 className={styles.name}>{gadget.name}</h3>
      <p className={styles.price}>GH₵{gadget.daily_rate_ghs}/day</p>

      {available ? (
        <Link href={`/rentals/gadgets/${gadget.id}`} className={styles.cta}>
          Rent Now
        </Link>
      ) : (
        <span className={`${styles.cta} ${styles.ctaDisabled}`} aria-disabled="true">
          Rent Now
        </span>
      )}
    </article>
  );
}
