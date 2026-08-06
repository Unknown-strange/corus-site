"use client";

import Image from "next/image";
import Link from "next/link";
import { RentEquipment } from "@/lib/types";
import styles from "./GadgetCard.module.css";

type Props = {
  gadget: RentEquipment;
};

export default function GadgetCard({ gadget }: Props) {
  const available = gadget.stock > 0;
  const dailyRate = parseFloat(gadget.daily_rate_ghs);

  return (
    <article className={`${styles.card} ${available ? "" : styles.cardUnavailable}`}>
      {available ? null : <span className={styles.badge}>Not Available</span>}

      <div className={styles.imageWrap}>
        <Image
          src={gadget.image_url || "/images/placeholder.png"}
          alt={gadget.name}
          fill
          sizes="(max-width: 40rem) 50vw, (max-width: 64rem) 33vw, 25vw"
          className={styles.image}
        />
      </div>

      <h3 className={styles.name}>{gadget.name}</h3>
      <p className={styles.price}>GH₵{dailyRate.toFixed(2)}/day</p>

      {available ? (
        <Link href={`/rentals/${gadget.slug}`} className={styles.cta}>
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