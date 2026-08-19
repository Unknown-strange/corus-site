"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Clock3,
  CheckCircle2,
  XCircle,
  UserRound,
  RefreshCw,
} from "lucide-react";

import NavbarAdmin from "@/components/NavbarAdmin";
import Footer from "@/components/Footer";

import styles from "./page.module.css";

type OrderItem = {
  product_id: string;
  product_name: string;
  unit_price_ghs: string;
  quantity: number;
  line_total_ghs: string;
};

type Order = {
  id: string;
  user_id: string;
  customer_email: string;
  customer_name: string;
  status: string;
  total_ghs: string;
  paystack_reference: string;
  paid_at: string;
  created_at: string;
  updated_at: string;
  items: OrderItem[];
};

type OrdersResponse = {
  items: Order[];
  total: number;
  page: number;
  limit: number;
  pages: number;
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

const formatDate = (value: string) => {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString(
    "en-GB",
    {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }
  );
};

const formatStatus = (
  status: string
) => {
  return status
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (letter) =>
      letter.toUpperCase()
    );
};

const getStatusClass = (
  status: string
) => {
  const normalized =
    status.toLowerCase();

  if (
    normalized.includes("complete") ||
    normalized.includes("paid") ||
    normalized.includes("delivered") ||
    normalized.includes("approved")
  ) {
    return styles.completed;
  }

  if (
    normalized.includes("cancel") ||
    normalized.includes("reject") ||
    normalized.includes("failed")
  ) {
    return styles.cancelled;
  }

  if (
    normalized.includes("process") ||
    normalized.includes("confirm") ||
    normalized.includes("ready")
  ) {
    return styles.processing;
  }

  return styles.pending;
};

const StatusIcon = ({
  status,
}: {
  status: string;
}) => {
  const normalized =
    status.toLowerCase();

  if (
    normalized.includes("complete") ||
    normalized.includes("paid") ||
    normalized.includes("delivered") ||
    normalized.includes("approved")
  ) {
    return <CheckCircle2 size={13} />;
  }

  if (
    normalized.includes("cancel") ||
    normalized.includes("reject") ||
    normalized.includes("failed")
  ) {
    return <XCircle size={13} />;
  }

  return <Clock3 size={13} />;
};

export default function OrdersAdmin() {
  const [orders, setOrders] =
    useState<Order[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [error, setError] =
    useState<string | null>(null);

  const [page, setPage] =
    useState(1);

  const [pages, setPages] =
    useState(1);

  const [total, setTotal] =
    useState(0);

  const [statusFilter, setStatusFilter] =
    useState("");

  const [limit] =
    useState(10);

  const fetchOrders = async (
    showRefresh = false
  ) => {
    try {
      if (showRefresh) {
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

      const params =
        new URLSearchParams();

      params.set(
        "page",
        page.toString()
      );

      params.set(
        "limit",
        limit.toString()
      );

      if (statusFilter) {
        params.set(
          "status",
          statusFilter
        );
      }

      const response =
        await fetch(
          `${API_BASE}/admin/orders?${params.toString()}`,
          {
            method: "GET",
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
        throw new Error(
          "Failed to load orders."
        );
      }

      const data: OrdersResponse =
        await response.json();

      setOrders(
        Array.isArray(data.items)
          ? data.items
          : []
      );

      setTotal(
        Number(data.total) || 0
      );

      setPages(
        Number(data.pages) || 1
      );
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : "Failed to load orders."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [page, statusFilter]);

  /*
   * Build status filter options from
   * statuses actually returned by the API.
   */
  const statusOptions =
    useMemo(() => {
      const values =
        orders
          .map((order) =>
            order.status?.trim()
          )
          .filter(Boolean);

      return Array.from(
        new Set(values)
      );
    }, [orders]);

  const pendingCount =
    orders.filter(
      (order) =>
        order.status
          .toLowerCase()
          .includes("pending")
    ).length;

  const completedCount =
    orders.filter(
      (order) => {
        const status =
          order.status.toLowerCase();

        return (
          status.includes(
            "complete"
          ) ||
          status.includes(
            "paid"
          ) ||
          status.includes(
            "delivered"
          )
        );
      }
    ).length;

  const totalValue = orders.reduce(
    (sum, order) => {
      const value =
        Number(order.total_ghs);

      return Number.isNaN(value)
        ? sum
        : sum + value;
    },
    0
  );

  return (
    <>
      <NavbarAdmin />

      <main className={styles.page}>
        <div className={styles.container}>

          {/* =================================================
              HERO
          ================================================= */}

          <section className={styles.hero}>
            <div className={styles.heroContent}>
              <span
                className={styles.eyebrow}
              >
                Order Management
              </span>

              <h1
                className={styles.heading}
              >
                Orders
              </h1>

              <p
                className={styles.subtitle}
              >
                Review customer orders,
                payment information and
                order status from one place.
              </p>
            </div>

            <div
              className={styles.heroStats}
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
                  <ClipboardList
                    size={20}
                  />
                </div>

                <div>
                  <strong>
                    {total}
                  </strong>

                  <span>
                    Total Orders
                  </span>
                </div>
              </div>

              <div
                className={`${styles.smallStat} ${styles.pendingStat}`}
              >
                <strong>
                  {pendingCount}
                </strong>

                <span>
                  Pending
                </span>
              </div>

              <div
                className={`${styles.smallStat} ${styles.completedStat}`}
              >
                <strong>
                  {completedCount}
                </strong>

                <span>
                  Completed
                </span>
              </div>
            </div>
          </section>

          {/* =================================================
              MAIN CARD
          ================================================= */}

          <section
            className={
              styles.ordersCard
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
                    All Orders
                  </h2>

                  <span
                    className={
                      styles.countBadge
                    }
                  >
                    {orders.length} shown
                  </span>
                </div>

                <p>
                  Manage customer purchases
                  and order status.
                </p>
              </div>

              <div
                className={
                  styles.controls
                }
              >
                <select
                  value={statusFilter}
                  onChange={(event) => {
                    setPage(1);

                    setStatusFilter(
                      event.target.value
                    );
                  }}
                  className={
                    styles.filter
                  }
                  aria-label="Filter by status"
                >
                  <option value="">
                    All statuses
                  </option>

                  {statusOptions.map(
                    (status) => (
                      <option
                        key={status}
                        value={status}
                      >
                        {formatStatus(
                          status
                        )}
                      </option>
                    )
                  )}
                </select>

                <button
                  type="button"
                  className={
                    styles.refreshButton
                  }
                  onClick={() =>
                    fetchOrders(
                      true
                    )
                  }
                  disabled={
                    refreshing
                  }
                  aria-label="Refresh orders"
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
              </div>
            </div>

            {/* =================================================
                ERROR
            ================================================= */}

            {error && (
              <div
                className={
                  styles.error
                }
              >
                <span>{error}</span>

                <button
                  type="button"
                  onClick={() =>
                    fetchOrders()
                  }
                >
                  Retry
                </button>
              </div>
            )}

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
                  length: 6,
                }).map((_, index) => (
                  <div
                    key={index}
                    className={
                      styles.skeleton
                    }
                  />
                ))}
              </div>
            ) : orders.length ===
              0 ? (
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
                  <ClipboardList
                    size={28}
                  />
                </div>

                <h3>
                  No orders found
                </h3>

                <p>
                  There are no orders
                  matching the current
                  filter.
                </p>
              </div>
            ) : (
              <div
                className={
                  styles.list
                }
              >
                {orders.map(
                  (order) => (
                    <Link
                      key={order.id}
                      href={`/admin/Orders/${order.id}`}
                      className={
                        styles.orderItem
                      }
                    >
                      {/* CUSTOMER */}

                      <div
                        className={
                          styles.customerIcon
                        }
                      >
                        <UserRound
                          size={19}
                        />
                      </div>

                      <div
                        className={
                          styles.customerInfo
                        }
                      >
                        <span
                          className={
                            styles.label
                          }
                        >
                          Customer
                        </span>

                        <strong
                          className={
                            styles.customerName
                          }
                        >
                          {
                            order.customer_name
                          }
                        </strong>

                        <span
                          className={
                            styles.email
                          }
                        >
                          {
                            order.customer_email
                          }
                        </span>
                      </div>

                      {/* ITEMS */}

                      <div
                        className={
                          styles.orderMeta
                        }
                      >
                        <span
                          className={
                            styles.label
                          }
                        >
                          Items
                        </span>

                        <strong>
                          {
                            order.items
                              ?.length ||
                            0
                          }
                        </strong>
                      </div>

                      {/* TOTAL */}

                      <div
                        className={
                          styles.orderMeta
                        }
                      >
                        <span
                          className={
                            styles.label
                          }
                        >
                          Total
                        </span>

                        <strong
                          className={
                            styles.total
                          }
                        >
                          {formatMoney(
                            order.total_ghs
                          )}
                        </strong>
                      </div>

                      {/* STATUS */}

                      <div
                        className={
                          styles.statusArea
                        }
                      >
                        <span
                          className={`${styles.status} ${
                            getStatusClass(
                              order.status
                            )
                          }`}
                        >
                          <StatusIcon
                            status={
                              order.status
                            }
                          />

                          {formatStatus(
                            order.status
                          )}
                        </span>

                        <small>
                          {formatDate(
                            order.created_at
                          )}
                        </small>
                      </div>

                      {/* ARROW */}

                      <div
                        className={
                          styles.arrow
                        }
                      >
                        <ArrowRight
                          size={18}
                        />
                      </div>
                    </Link>
                  )
                )}
              </div>
            )}

            {/* =================================================
                PAGINATION
            ================================================= */}

            {!loading &&
              pages > 1 && (
                <div
                  className={
                    styles.pagination
                  }
                >
                  <button
                    type="button"
                    onClick={() =>
                      setPage(
                        (current) =>
                          Math.max(
                            1,
                            current -
                              1
                          )
                      )
                    }
                    disabled={
                      page <= 1
                    }
                    className={
                      styles.pageButton
                    }
                  >
                    <ChevronLeft
                      size={16}
                    />
                    Previous
                  </button>

                  <span
                    className={
                      styles.pageInfo
                    }
                  >
                    Page {page} of{" "}
                    {pages}
                  </span>

                  <button
                    type="button"
                    onClick={() =>
                      setPage(
                        (current) =>
                          Math.min(
                            pages,
                            current +
                              1
                          )
                      )
                    }
                    disabled={
                      page >= pages
                    }
                    className={
                      styles.pageButton
                    }
                  >
                    Next
                    <ChevronRight
                      size={16}
                    />
                  </button>
                </div>
              )}
          </section>
        </div>
      </main>

      <Footer />
    </>
  );
}