"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  Edit,
  Plus,
  Camera,
  CheckCircle2,
  AlertTriangle,
  ArrowLeft,
  RefreshCw,
  Trash2,
} from "lucide-react";

import NavbarAdmin from "@/components/NavbarAdmin";
import Footer from "@/components/Footer";

import styles from "./page.module.css";

type RentalEquipment = {
  id: string;
  name: string;
  slug: string;
  description: string;
  daily_rate_ghs: string;
  stock: number;
  low_stock_threshold: number;
  effective_low_stock_threshold: number;
  is_low_stock: boolean;
  image_url: string;
  imagekit_file_id: string | null;
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

  return `GH₵${amount.toLocaleString(
    "en-GH",
    {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }
  )}`;
};

export default function RentalsAdmin() {
  const [rentals, setRentals] = useState<
    RentalEquipment[]
  >([]);

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [error, setError] =
    useState<string | null>(null);

  const [deletingId, setDeletingId] =
    useState<string | null>(null);

  /* =========================================================
     FETCH RENTALS
  ========================================================= */

  const fetchRentals = async (
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
          `${API_BASE}/admin/rent-equipment`,
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
          "Failed to load rental equipment."
        );
      }

      const data =
        await response.json();

      setRentals(
        Array.isArray(data)
          ? data
          : []
      );
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : "Failed to load rental equipment."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchRentals();
  }, []);

  /* =========================================================
     DELETE RENTAL
  ========================================================= */

  const handleDelete = async (
    equipmentId: string,
    equipmentName: string
  ) => {
    const confirmed =
      window.confirm(
        `Are you sure you want to delete "${equipmentName}"?\n\nThis action cannot be undone.`
      );

    if (!confirmed) {
      return;
    }

    try {
      setDeletingId(
        equipmentId
      );

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
          `${API_BASE}/admin/rent-equipment/${encodeURIComponent(
            equipmentId
          )}`,
          {
            method: "DELETE",
            headers: {
              Authorization:
                `Bearer ${token}`,
              Accept:
                "application/json",
            },
          }
        );

      /* -----------------------------------------
         UNAUTHORIZED
      ----------------------------------------- */

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

      /* -----------------------------------------
         SUCCESS
         DELETE endpoint returns 204
      ----------------------------------------- */

      if (
        response.status ===
        204
      ) {
        setRentals(
          (current) =>
            current.filter(
              (item) =>
                item.id !==
                equipmentId
            )
        );

        return;
      }

      /* -----------------------------------------
         OTHER SUCCESS RESPONSE
         Keep this tolerant in case backend
         returns a body later.
      ----------------------------------------- */

      if (response.ok) {
        setRentals(
          (current) =>
            current.filter(
              (item) =>
                item.id !==
                equipmentId
            )
        );

        return;
      }

      /* -----------------------------------------
         ERROR RESPONSE
      ----------------------------------------- */

      const responseData =
        await response
          .json()
          .catch(
            () => null
          );

      let message =
        "Failed to delete rental equipment.";

      if (
        Array.isArray(
          responseData?.detail
        )
      ) {
        message =
          responseData.detail
            .map(
              (item: {
                msg?: string;
              }) =>
                item.msg ||
                "Validation error"
            )
            .join(
              ", "
            );
      } else if (
        typeof responseData?.detail ===
        "string"
      ) {
        message =
          responseData.detail;
      } else if (
        responseData?.message
      ) {
        message =
          responseData.message;
      }

      throw new Error(
        message
      );
    } catch (err) {
      console.error(
        "Delete rental failed:",
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : "Failed to delete rental equipment."
      );
    } finally {
      setDeletingId(null);
    }
  };

  /* =========================================================
     STATS
  ========================================================= */

  const activeCount =
    rentals.filter(
      (item) =>
        item.is_active
    ).length;

  const lowStockCount =
    rentals.filter(
      (item) =>
        item.is_low_stock
    ).length;

  /* =========================================================
     RENDER
  ========================================================= */

  return (
    <>
      <NavbarAdmin />

      <main
        className={
          styles.page
        }
      >
        <div
          className={
            styles.container
          }
        >
          {/* =================================================
              HEADER
          ================================================= */}

          <section
            className={
              styles.hero
            }
          >
            <div
              className={
                styles.heroContent
              }
            >
              <Link
                href="/admin/Manage"
                className={
                  styles.backButton
                }
                aria-label="Back to Manage"
              >
                <ArrowLeft
                  size={18}
                />
              </Link>

              <span
                className={
                  styles.eyebrow
                }
              >
                Rental Management
              </span>

              <h1
                className={
                  styles.heading
                }
              >
                Manage your rentals
              </h1>

              <p
                className={
                  styles.subtitle
                }
              >
                Manage the photography
                equipment customers can
                rent from Corus Studio.
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
                  <Camera
                    size={20}
                  />
                </div>

                <div>
                  <strong>
                    {
                      rentals.length
                    }
                  </strong>

                  <span>
                    Equipment
                  </span>
                </div>
              </div>

              <div
                className={
                  styles.availableBox
                }
              >
                <CheckCircle2
                  size={16}
                />

                <span>
                  {activeCount} Active
                </span>
              </div>

              {lowStockCount >
                0 && (
                <div
                  className={
                    styles.lowStockBox
                  }
                >
                  <AlertTriangle
                    size={16}
                  />

                  <span>
                    {
                      lowStockCount
                    }{" "}
                    Low Stock
                  </span>
                </div>
              )}

              <button
                type="button"
                className={
                  styles.refreshButton
                }
                onClick={() =>
                  fetchRentals(
                    true
                  )
                }
                disabled={
                  refreshing
                }
                aria-label="Refresh rentals"
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
                href="/admin/Manage/add?type=rental"
                className={
                  styles.heroButton
                }
              >
                <Plus size={18} />
                Add Rental
              </Link>
            </div>
          </section>

          {/* =================================================
              ERROR
          ================================================= */}

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
                  fetchRentals()
                }
              >
                Retry
              </button>
            </div>
          )}

          {/* =================================================
              MAIN CARD
          ================================================= */}

          <section
            className={
              styles.storeCard
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
                    styles.titleRow
                  }
                >
                  <h2>
                    Rental Equipment
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
                  Equipment currently
                  configured for rental.
                </p>
              </div>

              <span
                className={
                  styles.count
                }
              >
                {rentals.length}{" "}
                {rentals.length ===
                1
                  ? "item"
                  : "items"}
              </span>
            </div>

            {/* =================================================
                LOADING
            ================================================= */}

            {loading ? (
              <div
                className={
                  styles.loadingList
                }
              >
                {Array.from({
                  length: 4,
                }).map(
                  (_, index) => (
                    <div
                      key={
                        index
                      }
                      className={
                        styles.skeleton
                      }
                    />
                  )
                )}
              </div>
            ) : rentals.length ===
              0 ? (
              /* =================================================
                  EMPTY
              ================================================= */

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
                  <Camera
                    size={28}
                  />
                </div>

                <h3>
                  No rental equipment
                </h3>

                <p>
                  Add your first piece
                  of rental equipment
                  to get started.
                </p>

                <Link
                  href="/admin/Manage/add?type=rental"
                  className={
                    styles.addButton
                  }
                >
                  <Plus size={18} />
                  Add Rental
                </Link>
              </div>
            ) : (
              /* =================================================
                  LIST
              ================================================= */

              <div
                className={
                  styles.list
                }
              >
                {rentals.map(
                  (item) => {
                    const isDeleting =
                      deletingId ===
                      item.id;

                    return (
                      <article
                        key={
                          item.id
                        }
                        className={
                          styles.item
                        }
                      >
                        {/* IMAGE */}

                        <div
                          className={
                            styles.imageWrapper
                          }
                        >
                          {item.image_url ? (
                            <Image
                              src={
                                item.image_url
                              }
                              alt={
                                item.name
                              }
                              width={
                                100
                              }
                              height={
                                100
                              }
                              className={
                                styles.cardImage
                              }
                            />
                          ) : (
                            <Camera
                              size={
                                28
                              }
                              className={
                                styles.imagePlaceholder
                              }
                            />
                          )}
                        </div>

                        {/* INFO */}

                        <div
                          className={
                            styles.info
                          }
                        >
                          <span
                            className={
                              styles.itemLabel
                            }
                          >
                            Rental Equipment
                          </span>

                          <h3
                            className={
                              styles.cardTitle
                            }
                          >
                            {
                              item.name
                            }
                          </h3>

                          <p
                            className={
                              styles.description
                            }
                          >
                            {
                              item.description
                            }
                          </p>

                          <div
                            className={
                              styles.stockRow
                            }
                          >
                            <span>
                              Stock:{" "}
                              <strong>
                                {
                                  item.stock
                                }
                              </strong>
                            </span>

                            {item.is_low_stock && (
                              <span
                                className={
                                  styles.lowStockBadge
                                }
                              >
                                Low Stock
                              </span>
                            )}
                          </div>
                        </div>

                        {/* PRICE */}

                        <div
                          className={
                            styles.priceBox
                          }
                        >
                          <span>
                            Daily Rate
                          </span>

                          <strong>
                            {formatMoney(
                              item.daily_rate_ghs
                            )}
                          </strong>
                        </div>

                        {/* STATUS */}

                        <span
                          className={`${styles.availability} ${
                            item.is_active
                              ? styles.available
                              : styles.unavailable
                          }`}
                        >
                          {item.is_active
                            ? "Active"
                            : "Inactive"}
                        </span>

                        {/* ACTIONS */}

                        <div
                          className={
                            styles.actions
                          }
                        >
                          <Link
                            href={`/admin/Manage/edit?id=${encodeURIComponent(
                              item.id
                            )}&type=rental`}
                            className={
                              styles.editButton
                            }
                            aria-label={`Edit ${item.name}`}
                          >
                            <Edit
                              size={
                                16
                              }
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
                                item.id,
                                item.name
                              )
                            }
                            disabled={
                              isDeleting
                            }
                            aria-label={`Delete ${item.name}`}
                          >
                            <Trash2
                              size={
                                16
                              }
                            />

                            <span>
                              {isDeleting
                                ? "Deleting..."
                                : "Delete"}
                            </span>
                          </button>
                        </div>
                      </article>
                    );
                  }
                )}
              </div>
            )}

            {/* =================================================
                ADD BUTTON
            ================================================= */}

            {!loading &&
              rentals.length >
                0 && (
                <Link
                  href="/admin/Manage/add?type=rental"
                  className={
                    styles.addButton
                  }
                >
                  <Plus size={18} />
                  Add Rental
                </Link>
              )}
          </section>
        </div>
      </main>

      <Footer />
    </>
  );
}