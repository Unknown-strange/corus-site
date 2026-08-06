"use client";

import { useState, useEffect } from "react";
import AdminStatCard from "./AdminStatCard";
import AdminTrendChart from "./AdminTrendChart";
import { STAT_CARDS, TREND_SERIES, type DashboardSummary } from "@/lib/admin-dashboard";
import api from "@/lib/api";
import styles from "./AdminHome.module.css";

export default function AdminHome() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<DashboardSummary | null>(null);

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const token = localStorage.getItem("access_token");
        if (!token) {
          setError("Please log in to view the dashboard.");
          setLoading(false);
          return;
        }

        

        const response = await api.admin.dashboard.summary(token);

        console.log("Dashboard response status:", response.status);

        if (!response.ok) {
          if (response.status === 401) {
            localStorage.removeItem("access_token");
            localStorage.removeItem("user");
            window.location.href = "/login";
            return;
          }

          if (response.status === 403) {
  setError("You don't have admin permissions. Please contact support.");
  setLoading(false);
  return;
}

          throw new Error("Failed to fetch dashboard data");
        }

        const data = await response.json();
        setSummary(data);
        setError(null);
      } catch (err) {
        console.error(err);
        setError("Failed to load dashboard data.");
      } finally {
        setLoading(false);
      }
    };

    fetchDashboard();
  }, []);

  // Build stat cards with real data
  const statCards = summary
    ? [
        {
          id: "bookings",
          labelLines: ["Today's", "Bookings"],
          value: summary.todays_bookings_count?.toString() || "0",
          delta: `+0%`, // We don't have delta from API yet
        },
        {
          id: "rentals",
          labelLines: ["Active", "Rentals"],
          value: summary.active_rentals?.toString() || "0",
          delta: `+0%`,
        },
        {
          id: "orders",
          labelLines: ["Pending", "Orders"],
          value: summary.pending_orders?.toString() || "0",
          delta: `+0%`,
        },
      ]
    : STAT_CARDS;

  if (loading) {
    return (
      <div className={styles.page}>
        <div className={styles.inner}>
          <div className={styles.loading}>Loading dashboard...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.page}>
        <div className={styles.inner}>
          <div className={styles.error}>{error}</div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.inner}>
        <div className={styles.stats}>
          {statCards.map((stat) => (
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