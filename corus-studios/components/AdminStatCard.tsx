import Image from "next/image";
import type { StatCard } from "@/lib/admin-dashboard";
import styles from "./AdminStatCard.module.css";

/**
 * A single headline figure. `value` and `delta` arrive pre-formatted so the
 * same card serves counts and currency without knowing which is which.
 *
 * All three cards share the same Overlay icon, per the design.
 */
export default function AdminStatCard({ stat }: { stat: StatCard }) {
  return (
    <article className={styles.card}>
      <div className={styles.top}>
        <span className={styles.iconWrap}>
          <Image
            src="/icons/Overlay.png"
            alt=""
            width={31}
            height={38}
            className={styles.icon}
          />
        </span>

        <p className={styles.delta}>
          {stat.delta}
          <span className={styles.deltaPeriod}>TODAY</span>
        </p>
      </div>

      <p className={styles.label}>
        {stat.labelLines.map((line) => (
          <span key={line} className={styles.labelLine}>
            {line}
          </span>
        ))}
      </p>

      <p className={styles.value}>{stat.value}</p>
    </article>
  );
}
