"use client";

import {
  useEffect,
  useState,
} from "react";

import {
  CalendarDays,
  Camera,
  ShoppingBag,
  Clock3,
  Activity as ActivityIcon,
} from "lucide-react";

import {
  formatRelativeTime,
  type DashboardActivity,
} from "@/lib/admin-dashboard";

import styles from "./RecentActivity.module.css";

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:8000";

function getActivityIcon(
  eventType: string
) {
  const value =
    eventType.toLowerCase();

  if (
    value.includes("booking") ||
    value.includes("session")
  ) {
    return CalendarDays;
  }

  if (
    value.includes("rental")
  ) {
    return Camera;
  }

  if (
    value.includes("order") ||
    value.includes("product") ||
    value.includes("payment")
  ) {
    return ShoppingBag;
  }

  return ActivityIcon;
}

function getActivityClass(
  eventType: string
) {
  const value =
    eventType.toLowerCase();

  if (
    value.includes("booking") ||
    value.includes("session")
  ) {
    return styles.booking;
  }

  if (
    value.includes("rental")
  ) {
    return styles.rental;
  }

  if (
    value.includes("order") ||
    value.includes("product") ||
    value.includes("payment")
  ) {
    return styles.order;
  }

  return styles.default;
}

export default function RecentActivity() {
  const [
    activities,
    setActivities,
  ] = useState<
    DashboardActivity[]
  >([]);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    error,
    setError,
  ] = useState<string | null>(
    null
  );

  useEffect(() => {
    const fetchActivity =
      async () => {
        try {
          const token =
            localStorage.getItem(
              "access_token"
            );

          if (!token) {
            setError(
              "Please log in."
            );

            setLoading(false);

            return;
          }

          const response =
            await fetch(
              `${API_BASE}/admin/dashboard/activity?page=1&limit=5&days=30`,
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

            return;
          }

          if (!response.ok) {
            throw new Error(
              "Failed to load activity."
            );
          }

          const data =
            await response.json();

          setActivities(
            Array.isArray(
              data?.items
            )
              ? data.items
              : []
          );
        } catch (err) {
          console.error(err);

          setError(
            "Unable to load activity."
          );
        } finally {
          setLoading(false);
        }
      };

    fetchActivity();
  }, []);

  return (
    <article
      className={
        styles.card
      }
    >
      {/* HEADER */}

      <div
        className={
          styles.header
        }
      >
        <div
          className={
            styles.titleArea
          }
        >
          <div
            className={
              styles.icon
            }
          >
            <Clock3
              size={20}
            />
          </div>

          <div>
            <h2
              className={
                styles.title
              }
            >
              Recent Activity
            </h2>

            <p
              className={
                styles.subtitle
              }
            >
              Latest activity
            </p>
          </div>
        </div>
      </div>

      {/* LOADING */}

      {loading && (
        <div
          className={
            styles.loading
          }
        >
          <div
            className={
              styles.activitySkeleton
            }
          />

          <div
            className={
              styles.activitySkeleton
            }
          />

          <div
            className={
              styles.activitySkeleton
            }
          />

          <div
            className={
              styles.activitySkeleton
            }
          />
        </div>
      )}

      {/* ERROR */}

      {!loading &&
        error && (
          <div
            className={
              styles.empty
            }
          >
            <span>
              {error}
            </span>
          </div>
        )}

      {/* EMPTY */}

      {!loading &&
        !error &&
        activities.length ===
          0 && (
          <div
            className={
              styles.empty
            }
          >
            <ActivityIcon
              size={22}
            />

            <span>
              No recent activity.
            </span>
          </div>
        )}

      {/* ACTIVITY */}

      {!loading &&
        !error &&
        activities.length >
          0 && (
          <div
            className={
              styles.list
            }
          >
            {activities.map(
              (activity) => {
                const Icon =
                  getActivityIcon(
                    activity.event_type
                  );

                return (
                  <div
                    key={
                      activity.id
                    }
                    className={
                      styles.item
                    }
                  >
                    <div
                      className={`${styles.itemIcon} ${getActivityClass(
                        activity.event_type
                      )}`}
                    >
                      <Icon
                        size={18}
                      />
                    </div>

                    <div
                      className={
                        styles.itemMain
                      }
                    >
                      <strong>
                        {
                          activity.title
                        }
                      </strong>

                      <span>
                        {
                          activity.description
                        }
                      </span>

                      {activity.reference_id && (
                        <small>
                          {
                            activity.reference_id
                          }
                        </small>
                      )}
                    </div>

                    <div
                      className={
                        styles.itemRight
                      }
                    >
                      <span
                        className={
                          styles.time
                        }
                      >
                        {formatRelativeTime(
                          activity.occurred_at
                        )}
                      </span>
                    </div>
                  </div>
                );
              }
            )}
          </div>
        )}
    </article>
  );
}