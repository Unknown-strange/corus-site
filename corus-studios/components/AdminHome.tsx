import AdminStatCard from "./AdminStatCard";
import AdminTrendChart from "./AdminTrendChart";
import { STAT_CARDS, TREND_SERIES } from "@/lib/admin-dashboard";
import styles from "./AdminHome.module.css";

/**
 * Admin homepage: three headline figures above a grid of trend cards.
 *
 * The admin navbar is deliberately absent — it belongs to someone else and
 * sits above this component on the page.
 *
 * Everything here is placeholder data. The stat cards map only partly to
 * `GET /admin/dashboard/summary`, and the trend charts have no endpoint at
 * all; see the warning at the top of lib/admin-dashboard.ts.
 */
export default function AdminHome() {
  return (
    <div className={styles.page}>
      <div className={styles.inner}>
        <div className={styles.stats}>
          {STAT_CARDS.map((stat) => (
            <AdminStatCard key={stat.id} stat={stat} />
          ))}
        </div>

        <div className={styles.charts}>
          {TREND_SERIES.map((series) => (
            <AdminTrendChart key={series.id} series={series} />
          ))}
        </div>
      </div>
    </div>
  );
}
