"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Edit,
  Plus,
  Trash2,
  Package,
  CheckCircle2,
  ArrowLeft,
  RefreshCw,
} from "lucide-react";
import { useRouter } from "next/navigation";

import NavbarAdmin from "@/components/NavbarAdmin";
import Footer from "@/components/Footer";

import styles from "./page.module.css";

type SessionType = {
  id: string;
  name: string;
  slug: string;
  description: string;
  price_ghs: string;
  duration_minutes: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:8000";

const formatMoney = (value: string) => {
  const amount = Number(value);

  if (Number.isNaN(amount)) {
    return `GH₵${value}`;
  }

  return `GH₵${amount.toLocaleString("en-GH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

const formatDuration = (minutes: number) => {
  if (minutes < 60) {
    return `${minutes} min`;
  }

  const hours = Math.floor(minutes / 60);
  const remaining = minutes % 60;

  if (remaining === 0) {
    return `${hours} hr`;
  }

  return `${hours} hr ${remaining} min`;
};

export default function PackagesAdmin() {
  const router = useRouter();

  const [packages, setPackages] =
    useState<SessionType[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [error, setError] =
    useState<string | null>(null);

  const goBack = () => {
    router.push(
      "/admin/Manage/booking"
    );
  };

  const fetchPackages = async (
    refresh = false
  ) => {
    try {
      if (refresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError(null);

      const token =
        localStorage.getItem(
          "access_token"
        );

      if (!token) {
        window.location.href =
          "/login";
        return;
      }

      const response =
        await fetch(
          `${API_BASE}/admin/session-types`,
          {
            headers: {
              Authorization:
                `Bearer ${token}`,
              Accept:
                "application/json",
            },
          }
        );

      if (response.status === 401) {
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
        const body =
          await response
            .json()
            .catch(() => null);

        throw new Error(
          body?.detail ||
            "Failed to load booking packages."
        );
      }

      const data =
        await response.json();

      setPackages(
        Array.isArray(data)
          ? data
          : []
      );
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : "Failed to load booking packages."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchPackages();
  }, []);

  const handleDelete = async (
    id: string
  ) => {
    const confirmed =
      window.confirm(
        "Are you sure you want to delete this package?"
      );

    if (!confirmed) return;

    try {
      const token =
        localStorage.getItem(
          "access_token"
        );

      if (!token) {
        window.location.href =
          "/login";
        return;
      }

      const response =
        await fetch(
          `${API_BASE}/admin/session-types/${id}`,
          {
            method: "DELETE",
            headers: {
              Authorization:
                `Bearer ${token}`,
            },
          }
        );

      if (response.status === 401) {
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
        const body =
          await response
            .json()
            .catch(() => null);

        throw new Error(
          body?.detail ||
            "Failed to delete package."
        );
      }

      setPackages(
        (current) =>
          current.filter(
            (item) =>
              item.id !== id
          )
      );
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : "Failed to delete package."
      );
    }
  };

  const activeCount =
    packages.filter(
      (item) => item.is_active
    ).length;

  return (
    <>
      <NavbarAdmin />

      <main className={styles.page}>
        <div
          className={styles.container}
        >

          {/* HEADER */}

          <section
            className={styles.hero}
          >
            <div
              className={
                styles.heroContent
              }
            >
              <button
                type="button"
                className={
                  styles.backButton
                }
                onClick={goBack}
                aria-label="Go back"
              >
                <ArrowLeft
                  size={19}
                />
              </button>

              <span
                className={
                  styles.eyebrow
                }
              >
                Booking Management
              </span>

              <h1
                className={
                  styles.heading
                }
              >
                Manage your packages
              </h1>

              <p
                className={
                  styles.subtitle
                }
              >
                Create and maintain the
                photography packages available
                to customers during booking.
              </p>
            </div>

            <div
              className={
                styles.heroActions
              }
            >
              <div
                className={
                  styles.statBox
                }
              >
                <div
                  className={
                    styles.statIcon
                  }
                >
                  <Package size={20} />
                </div>

                <div>
                  <strong>
                    {packages.length}
                  </strong>

                  <span>
                    Total packages
                  </span>
                </div>
              </div>

              <div
                className={
                  styles.activeBox
                }
              >
                <CheckCircle2
                  size={16}
                />

                <span>
                  {activeCount} Active
                </span>
              </div>

              <button
                type="button"
                className={
                  styles.refreshButton
                }
                onClick={() =>
                  fetchPackages(true)
                }
                disabled={
                  refreshing
                }
              >
                <RefreshCw
                  size={16}
                  className={
                    refreshing
                      ? styles.spinning
                      : ""
                  }
                />
              </button>

              <Link
                href="/admin/Manage/booking/packages/add"
                className={
                  styles.heroButton
                }
              >
                <Plus size={18} />
                Add Package
              </Link>
            </div>
          </section>

          {error && (
            <div
              className={
                styles.error
              }
            >
              <span>
                {error}
              </span>

              <button
                type="button"
                onClick={() =>
                  fetchPackages()
                }
              >
                Retry
              </button>
            </div>
          )}

          {/* PACKAGE LIST */}

          <section
            className={
              styles.packageCard
            }
          >
            <div
              className={
                styles.cardHeader
              }
            >
              <div>
                <div
                  className={
                    styles.cardTitleRow
                  }
                >
                  <h2>
                    Available Packages
                  </h2>

                  <span
                    className={
                      styles.activeBadge
                    }
                  >
                    <CheckCircle2
                      size={13}
                    />
                    {activeCount} Active
                  </span>
                </div>

                <p>
                  Packages currently configured
                  for customer bookings.
                </p>
              </div>

              <span
                className={styles.count}
              >
                {packages.length}{" "}
                {packages.length === 1
                  ? "package"
                  : "packages"}
              </span>
            </div>

            {loading ? (
              <div
                className={
                  styles.loadingList
                }
              >
                {Array.from({
                  length: 3,
                }).map((_, index) => (
                  <div
                    key={index}
                    className={
                      styles.skeleton
                    }
                  />
                ))}
              </div>
            ) : packages.length === 0 ? (
              <div
                className={
                  styles.empty
                }
              >
                <div
                  className={
                    styles.emptyIcon
                  }
                >
                  <Package size={26} />
                </div>

                <h3>
                  No packages yet
                </h3>

                <p>
                  Add your first photography
                  package to make it available
                  for customer bookings.
                </p>

                <Link
                  href="/admin/Manage/booking/packages/add"
                  className={
                    styles.emptyButton
                  }
                >
                  <Plus size={17} />
                  Add Package
                </Link>
              </div>
            ) : (
              <div
                className={styles.list}
              >
                {packages.map(
                  (pkg) => (
                    <article
                      key={pkg.id}
                      className={
                        styles.item
                      }
                    >
                      <div
                        className={
                          styles.packageIcon
                        }
                      >
                        <Package size={20} />
                      </div>

                      <div
                        className={
                          styles.info
                        }
                      >
                        <div
                          className={
                            styles.packageTop
                          }
                        >
                          <span
                            className={
                              styles.packageLabel
                            }
                          >
                            {
                              pkg.name
                            }
                          </span>

                          <span
                            className={`${styles.statusBadge} ${
                              pkg.is_active
                                ? styles.activeStatus
                                : styles.inactiveStatus
                            }`}
                          >
                            {pkg.is_active
                              ? "Active"
                              : "Inactive"}
                          </span>
                        </div>

                        <h3
                          className={
                            styles.price
                          }
                        >
                          {formatMoney(
                            pkg.price_ghs
                          )}
                        </h3>

                        <p
                          className={
                            styles.description
                          }
                        >
                          {
                            pkg.description
                          }
                        </p>

                        <div
                          className={
                            styles.packageMeta
                          }
                        >
                          <span>
                            {formatDuration(
                              pkg.duration_minutes
                            )}
                          </span>

                          <span>
                            /
                            {pkg.slug}
                          </span>
                        </div>
                      </div>

                      <div
                        className={
                          styles.actions
                        }
                      >
                        <Link
                          href={`/admin/Manage/booking/packages/edit?id=${encodeURIComponent(
                            pkg.id
                          )}`}
                          className={
                            styles.editButton
                          }
                        >
                          <Edit
                            size={17}
                          />

                          <span>
                            Edit
                          </span>
                        </Link>

                        <button
                          type="button"
                          className={
                            styles.deleteButton
                          }
                          onClick={() =>
                            handleDelete(
                              pkg.id
                            )
                          }
                        >
                          <Trash2
                            size={17}
                          />
                        </button>
                      </div>
                    </article>
                  )
                )}
              </div>
            )}

            {!loading &&
              packages.length > 0 && (
                <Link
                  href="/admin/Manage/booking/packages/add"
                  className={
                    styles.addButton
                  }
                >
                  <Plus size={18} />
                  Add Package
                </Link>
              )}
          </section>
        </div>
      </main>

      <Footer />
    </>
  );
}