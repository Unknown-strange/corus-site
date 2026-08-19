"use client";

import { useEffect, useState } from "react";
import {
  CalendarDays,
  Camera,
  ShoppingBag,
} from "lucide-react";

import AdminStatCard from "./AdminStatCard";
import AdminTrendChart from "./AdminTrendChart";
import RecentActivity from "./RecentActivity";

import {
  RANGE_OPTIONS,
  TREND_SERIES,
  type AnalyticsOverview,
  type DashboardSummary,
  type StatCard,
} from "@/lib/admin-dashboard";

import api from "@/lib/api";

import styles from "./AdminHome.module.css";

type AnalyticsState = {
  "7": AnalyticsOverview | null;
  "30": AnalyticsOverview | null;
  "90": AnalyticsOverview | null;
};

export default function AdminHome() {
  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState<string | null>(null);

  const [summary, setSummary] =
    useState<DashboardSummary | null>(
      null
    );

  const [analytics, setAnalytics] =
    useState<AnalyticsState>({
      "7": null,
      "30": null,
      "90": null,
    });

  const [currentDate, setCurrentDate] =
    useState("");

  const [currentTime, setCurrentTime] =
    useState("");

  /* =========================================================
     DATE / TIME
  ========================================================= */

  useEffect(() => {
    const updateDateTime = () => {
      const now = new Date();

      setCurrentDate(
        now.toLocaleDateString(
          "en-US",
          {
            weekday: "long",
            month: "long",
            day: "numeric",
            year: "numeric",
          }
        )
      );

      setCurrentTime(
        now.toLocaleTimeString(
          "en-US",
          {
            hour: "numeric",
            minute: "2-digit",
            hour12: true,
          }
        )
      );
    };

    updateDateTime();

    const interval =
      setInterval(
        updateDateTime,
        60 * 1000
      );

    return () =>
      clearInterval(interval);
  }, []);

  /* =========================================================
     DASHBOARD DATA
  ========================================================= */

  useEffect(() => {
    const fetchDashboard =
      async () => {
        try {
          setLoading(true);
          setError(null);

          const token =
            localStorage.getItem(
              "access_token"
            );

          if (!token) {
            setError(
              "Please log in to continue."
            );

            setLoading(false);

            return;
          }

          /*
           * Main dashboard summary
           */

          const summaryResponse =
            await api.admin.dashboard.summary(
              token
            );

          if (
            summaryResponse.status ===
            401
          ) {
            localStorage.removeItem(
              "access_token"
            );

            localStorage.removeItem(
              "user"
            );

            window.location.href =
              "/login";

            return;
          }

          if (
            summaryResponse.status ===
            403
          ) {
            setError(
              "You don't have permission to access this dashboard."
            );

            setLoading(false);

            return;
          }

          if (
            !summaryResponse.ok
          ) {
            throw new Error(
              "Dashboard request failed."
            );
          }

          const summaryData =
            await summaryResponse.json();

          setSummary(
            summaryData
          );

          /*
           * Analytics
           *
           * The backend accepts date ranges.
           * We request the current month and use
           * the response for the chart.
           */

          const analyticsResponses =
            await Promise.all(
              RANGE_OPTIONS.map(
                async (range) => {
                  const end =
                    new Date();

                  const start =
                    new Date();

                  start.setDate(
                    end.getDate() -
                      (range.days - 1)
                  );

                  const params =
                    new URLSearchParams({
                      start:
                        start
                          .toISOString()
                          .split(
                            "T"
                          )[0],

                      end:
                        end
                          .toISOString()
                          .split(
                            "T"
                          )[0],

                      interval:
                        "day",

                      top_limit:
                        "5",
                    });

                  const response =
                    await fetch(
                      `${
                        process.env
                          .NEXT_PUBLIC_API_URL ||
                        "http://localhost:8000"
                      }/admin/analytics/overview?${params.toString()}`,
                      {
                        headers: {
                          Authorization:
                            `Bearer ${token}`,

                          Accept:
                            "application/json",
                        },
                      }
                    );

                  if (
                    response.status ===
                    401
                  ) {
                    localStorage.removeItem(
                      "access_token"
                    );

                    localStorage.removeItem(
                      "user"
                    );

                    window.location.href =
                      "/login";

                    return null;
                  }

                  if (
                    !response.ok
                  ) {
                    throw new Error(
                      "Failed to load analytics."
                    );
                  }

                  return {
                    days:
                      range.days,

                    data:
                      (await response.json()) as AnalyticsOverview,
                  };
                }
              )
            );

          const analyticsMap =
            {
              "7": null,
              "30": null,
              "90": null,
            } as AnalyticsState;

          analyticsResponses.forEach(
            (result) => {
              if (!result) return;

              if (
                result.days ===
                7
              ) {
                analyticsMap["7"] =
                  result.data;
              }

              if (
                result.days ===
                30
              ) {
                analyticsMap["30"] =
                  result.data;
              }

              if (
                result.days ===
                90
              ) {
                analyticsMap["90"] =
                  result.data;
              }
            }
          );

          setAnalytics(
            analyticsMap
          );
        } catch (err) {
          console.error(err);

          setError(
            err instanceof Error
              ? err.message
              : "Failed to load dashboard."
          );
        } finally {
          setLoading(false);
        }
      };

    fetchDashboard();
  }, []);

  /* =========================================================
     STAT CARDS
  ========================================================= */

  const statCards: StatCard[] =
    summary
      ? [
          {
            id: "bookings",

            label:
              "Today's Bookings",

            value:
              summary.todays_bookings_count?.toString() ||
              "0",

            delta: "Today",

            icon:
              CalendarDays,

            color:
              "#ff5b00",
          },

          {
            id: "rentals",

            label:
              "Active Rentals",

            value:
              summary.active_rentals?.toString() ||
              "0",

            delta: "Active",

            icon: Camera,

            color:
              "#2563eb",
          },

          {
            id: "orders",

            label:
              "Pending Orders",

            value:
              summary.pending_orders?.toString() ||
              "0",

            delta: "Pending",

            icon:
              ShoppingBag,

            color:
              "#22c55e",
          },
        ]
      : [];

  /* =========================================================
     LOADING
  ========================================================= */

  if (loading) {
    return (
      <main
        className={styles.page}
      >
        <div
          className={
            styles.inner
          }
        >
          <div
            className={
              styles.heroSkeleton
            }
          />

          <div
            className={
              styles.statsSkeletonGrid
            }
          >
            <div
              className={
                styles.skeletonCard
              }
            />

            <div
              className={
                styles.skeletonCard
              }
            />

            <div
              className={
                styles.skeletonCard
              }
            />
          </div>

          <div
            className={
              styles.dashboardSkeletonGrid
            }
          >
            <div
              className={
                styles.skeletonChart
              }
            />

            <div
              className={
                styles.skeletonChart
              }
            />

            <div
              className={
                styles.skeletonChart
              }
            />

            <div
              className={
                styles.skeletonActivity
              }
            />
          </div>
        </div>
      </main>
    );
  }

  /* =========================================================
     ERROR
  ========================================================= */

  if (error) {
    return (
      <main
        className={styles.page}
      >
        <div
          className={
            styles.inner
          }
        >
          <div
            className={
              styles.errorCard
            }
          >
            <h2>
              Something went wrong
            </h2>

            <p>
              {error}
            </p>
          </div>
        </div>
      </main>
    );
  }

  /* =========================================================
     MAIN
  ========================================================= */

  return (
    <main className={styles.page}>
      <div className={styles.inner}>

        {/* HERO */}

        <section
          className={styles.hero}
        >
          <div
            className={
              styles.heroContent
            }
          >
            <span
              className={
                styles.badge
              }
            >
              <span
                className={
                  styles.badgeIcon
                }
              >
                ✦
              </span>

              Admin Dashboard
            </span>

            <h1
              className={
                styles.welcome
              }
            >
              Welcome back, admin{" "}
              <span
                className={
                  styles.wave
                }
              >
                👋
              </span>
            </h1>

            <p
              className={
                styles.heroText
              }
            >
              Here's an overview of
              today's activity at Corus
              Studio.
            </p>

            <div
              className={
                styles.heroMeta
              }
            >
              <div
                className={
                  styles.metaItem
                }
              >
                <div
                  className={
                    styles.metaIcon
                  }
                >
                  <CalendarDays
                    size={19}
                  />
                </div>

                <span>
                  {currentDate}
                </span>
              </div>

              <div
                className={
                  styles.metaItem
                }
              >
                <div
                  className={
                    styles.metaIcon
                  }
                >
                  <span
                    className={
                      styles.clockDot
                    }
                  />
                </div>

                <span>
                  {currentTime}
                </span>
              </div>
            </div>
          </div>

          <div
            className={
              styles.heroGlow
            }
          />
        </section>

        {/* STATS */}

        <section
          className={styles.stats}
        >
          {statCards.map(
            (stat) => (
              <AdminStatCard
                key={stat.id}
                stat={stat}
              />
            )
          )}
        </section>

        {/* CHARTS + ACTIVITY */}

        <section
          className={
            styles.dashboardGrid
          }
        >
          <AdminTrendChart
            series={
              TREND_SERIES[0]
            }
            analytics={analytics}
            accentColor="#ff5b00"
          />

          <AdminTrendChart
            series={
              TREND_SERIES[1]
            }
            analytics={analytics}
            accentColor="#2563eb"
          />

          <AdminTrendChart
            series={
              TREND_SERIES[2]
            }
            analytics={analytics}
            accentColor="#22c55e"
          />

          <RecentActivity />
        </section>

      </div>
    </main>
  );
}