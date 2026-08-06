"use client";

import type { StatCard } from "@/lib/admin-dashboard";
import styles from "./AdminStatCard.module.css";


export default function AdminStatCard({
  stat,
}: {
  stat: StatCard;
}) {


  const Icon = stat.icon;


  return (

    <article className={styles.card}>


      <div
        className={styles.topBorder}
        style={{
          background: stat.color,
        }}
      />



      <div className={styles.header}>


        <div
          className={styles.iconWrapper}
          style={{
            background:
              `${stat.color}15`,

            color:
              stat.color,
          }}
        >

          <Icon
            size={28}
            strokeWidth={2}
          />

        </div>



        <div className={styles.deltaWrapper}>

          <span className={styles.delta}>
            {stat.delta}
          </span>


          <span className={styles.today}>
            Today
          </span>

        </div>


      </div>




      <p className={styles.title}>
        {stat.label}
      </p>



      <h2 className={styles.value}>
        {stat.value}
      </h2>


    </article>

  );
}