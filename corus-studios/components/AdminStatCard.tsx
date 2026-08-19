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

            <div className={styles.content}>
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
                        size={27}
                        strokeWidth={2}
                    />
                </div>

                <div className={styles.main}>
                    <p className={styles.title}>
                        {stat.label}
                    </p>

                    <h2 className={styles.value}>
                        {stat.value}
                    </h2>

                    <div className={styles.bottom}>
                        <span
                            className={
                                styles.period
                            }
                        >
                            vs yesterday
                        </span>

                        <span
                            className={
                                styles.delta
                            }
                        >
                            {stat.delta}
                        </span>
                    </div>
                </div>
            </div>

            <div
                className={styles.miniChart}
                style={{
                    color: stat.color,
                }}
            >
                <svg
                    viewBox="0 0 140 65"
                    preserveAspectRatio="none"
                    aria-hidden="true"
                >
                    <path
                        d="M0 60 C15 53, 24 55, 36 40 S58 48, 70 35 S94 44, 107 22 S128 27, 140 8"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="3"
                        strokeLinecap="round"
                    />
                    <path
                        d="M0 60 C15 53, 24 55, 36 40 S58 48, 70 35 S94 44, 107 22 S128 27, 140 8 L140 65 L0 65 Z"
                        fill="currentColor"
                        opacity="0.08"
                    />
                </svg>
            </div>
        </article>
    );
}