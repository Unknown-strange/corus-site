"use client";

import Link from "next/link";
import { useState } from "react";
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import {
  RANGE_OPTIONS,
  getTrendPoints,
  summarise,
  weekdayName,
  type TrendSeries,
} from "@/lib/admin-dashboard";
import styles from "./AdminTrendChart.module.css";

type TooltipPayload = { payload: { date: string; value: number } };

/**
 * Tooltip content. The design shows no axis labels at all, so without this
 * there is no way to read a bar's value — it only appears on hover, so the
 * card still looks exactly as drawn at rest.
 */
function ChartTooltip({
  active,
  payload,
  metricLabel,
}: {
  active?: boolean;
  payload?: TooltipPayload[];
  metricLabel: string;
}) {
  if (!active || !payload?.length) {
    return null;
  }

  const point = payload[0].payload;

  return (
    <div className={styles.tooltip}>
      <div>{weekdayName(point.date)}</div>
      <div className={styles.tooltipValue}>
        {point.value} {metricLabel.toLowerCase()}
      </div>
    </div>
  );
}

/**
 * One trend card.
 *
 * Takes only a series descriptor and reads its points from the placeholder
 * module. When the trends endpoint exists (see lib/admin-dashboard.ts), the
 * only change here is where `points` comes from — the chart itself is already
 * driven entirely by the data it is handed, including the bar heights, the
 * peak day and the average.
 */
export default function AdminTrendChart({ series }: { series: TrendSeries }) {
  const [days, setDays] = useState(RANGE_OPTIONS[0].days);

  const points = getTrendPoints(series.id, days);
  const { peakDay, average } = summarise(points);

  return (
    <article className={styles.card}>
      <div className={styles.head}>
        <h2 className={styles.title}>{series.title}</h2>

        <select
          className={styles.range}
          aria-label={`${series.title} date range`}
          value={days}
          onChange={(event) => setDays(Number(event.target.value))}
        >
          {RANGE_OPTIONS.map((option) => (
            <option key={option.days} value={option.days}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <p className={styles.legend}>
        <span className={styles.legendDot} aria-hidden="true" />
        {series.metricLabel}
      </p>

      <div className={styles.chartBox}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={points} margin={{ top: 8, right: 0, bottom: 0, left: 0 }}>
            {/* Axes are hidden to match the design, but XAxis still supplies
                the category scale the bars are laid out on. */}
            <XAxis dataKey="date" hide />
            <YAxis hide />
            <Tooltip
              cursor={{ fill: "rgba(255, 81, 0, 0.08)" }}
              content={<ChartTooltip metricLabel={series.metricLabel} />}
            />
            <Bar dataKey="value" fill="#ff5100" barSize={days > 7 ? undefined : 74} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className={styles.footer}>
        <div className={styles.stat}>
          <span className={styles.statLabel}>Peak Day</span>
          <span className={styles.statValue}>{peakDay}</span>
        </div>

        <div className={styles.stat}>
          <span className={styles.statLabel}>Avg. Daily</span>
          <span className={styles.statValue}>{average}</span>
        </div>

        <Link href={`/admin/reports/${series.id}`} className={styles.report}>
          View Detailed Report
        </Link>
      </div>
    </article>
  );
}
