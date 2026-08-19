"use client";

import {
  useEffect,
  useState,
} from "react";

import {
  useParams,
  useRouter,
} from "next/navigation";

import {
  ArrowLeft,
  UserRound,
  Mail,
  CreditCard,
  CalendarDays,
  Package,
  CheckCircle2,
  Clock3,
  XCircle,
  Save,
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

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:8000";

const formatMoney = (
  value: string
) => {
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

const formatDateTime = (
  value: string
) => {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString(
    "en-GB",
    {
      dateStyle: "medium",
      timeStyle: "short",
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

export default function OrderDetailPage() {
  const router = useRouter();
  const params = useParams();

  const orderId =
    params?.id as string;

  const [order, setOrder] =
    useState<Order | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [updating, setUpdating] =
    useState(false);

  const [newStatus, setNewStatus] =
    useState("");

  const [error, setError] =
    useState<string | null>(null);

  const fetchOrder = async () => {
    try {
      setLoading(true);
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
          `${API_BASE}/admin/orders/${orderId}`,
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
          "Failed to load order."
        );
      }

      const data: Order =
        await response.json();

      setOrder(data);

      setNewStatus(
        data.status
      );
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : "Failed to load order."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrder();
  }, [orderId]);

  const updateStatus =
    async () => {
      if (
        !order ||
        !newStatus.trim()
      ) {
        return;
      }

      try {
        setUpdating(true);
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
            `${API_BASE}/admin/orders/${order.id}/status`,
            {
              method: "PATCH",
              headers: {
                Authorization:
                  `Bearer ${token}`,
                "Content-Type":
                  "application/json",
              },
              body: JSON.stringify({
                status:
                  newStatus,
              }),
            }
          );

        if (
          response.status === 401
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
          const body =
            await response
              .json()
              .catch(() => null);

          throw new Error(
            body?.detail ||
              "Failed to update order status."
          );
        }

        const updatedOrder: Order =
          await response.json();

        setOrder(
          updatedOrder
        );

        setNewStatus(
          updatedOrder.status
        );
      } catch (err) {
        console.error(err);

        setError(
          err instanceof Error
            ? err.message
            : "Failed to update order."
        );
      } finally {
        setUpdating(false);
      }
    };

  if (loading) {
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
            <div
              className={
                styles.loading
              }
            >
              <div
                className={
                  styles.spinner
                }
              />

              Loading order...
            </div>
          </div>
        </main>

        <Footer />
      </>
    );
  }

  if (!order) {
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
            <button
              type="button"
              className={
                styles.backButton
              }
              onClick={() =>
                router.push(
                  "/admin/Orders"
                )
              }
            >
              <ArrowLeft
                size={18}
              />
              Back to Orders
            </button>

            <div
              className={
                styles.notFound
              }
            >
              <Package
                size={28}
              />

              <h1>
                Order not found
              </h1>

              <p>
                The requested order
                could not be found.
              </p>
            </div>
          </div>
        </main>

        <Footer />
      </>
    );
  }

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

          {/* HEADER */}

          <section
            className={
              styles.pageHeader
            }
          >
            <button
              type="button"
              className={
                styles.backButton
              }
              onClick={() =>
                router.push(
                  "/admin/Orders"
                )
              }
            >
              <ArrowLeft
                size={19}
              />
              Back to Orders
            </button>

            <span
              className={
                styles.eyebrow
              }
            >
              Order Management
            </span>

            <h1
              className={
                styles.heading
              }
            >
              Order details
            </h1>

            <p
              className={
                styles.subtitle
              }
            >
              Review customer, payment
              and product information.
            </p>
          </section>

          {error && (
            <div
              className={
                styles.error
              }
            >
              {error}
            </div>
          )}

          {/* SUMMARY */}

          <section
            className={
              styles.summaryCard
            }
          >
            <div
              className={
                styles.customerHeader
              }
            >
              <div
                className={
                  styles.customerIcon
                }
              >
                <UserRound
                  size={23}
                />
              </div>

              <div>
                <span
                  className={
                    styles.label
                  }
                >
                  Customer
                </span>

                <h2>
                  {
                    order.customer_name
                  }
                </h2>

                <span
                  className={
                    styles.customerEmail
                  }
                >
                  {
                    order.customer_email
                  }
                </span>
              </div>
            </div>

            <div
              className={
                styles.summaryRight
              }
            >
              <span
                className={`${styles.status} ${
                  getStatusClass(
                    order.status
                  )
                }`}
              >
                {order.status
                  .toLowerCase()
                  .includes(
                    "complete"
                  ) ? (
                  <CheckCircle2
                    size={14}
                  />
                ) : order.status
                    .toLowerCase()
                    .includes(
                      "cancel"
                    ) ? (
                  <XCircle
                    size={14}
                  />
                ) : (
                  <Clock3
                    size={14}
                  />
                )}

                {formatStatus(
                  order.status
                )}
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
          </section>

          {/* INFORMATION */}

          <section
            className={
              styles.infoGrid
            }
          >
            <div
              className={
                styles.infoCard
              }
            >
              <div
                className={
                  styles.infoIcon
                }
              >
                <Mail size={18} />
              </div>

              <span>
                Email
              </span>

              <strong>
                {
                  order.customer_email
                }
              </strong>
            </div>

            <div
              className={
                styles.infoCard
              }
            >
              <div
                className={
                  styles.infoIcon
                }
              >
                <CreditCard
                  size={18}
                />
              </div>

              <span>
                Payment Reference
              </span>

              <strong>
                {
                  order.paystack_reference ||
                    "Not available"
                }
              </strong>
            </div>

            <div
              className={
                styles.infoCard
              }
            >
              <div
                className={
                  styles.infoIcon
                }
              >
                <CalendarDays
                  size={18}
                />
              </div>

              <span>
                Created
              </span>

              <strong>
                {formatDateTime(
                  order.created_at
                )}
              </strong>
            </div>

            <div
              className={
                styles.infoCard
              }
            >
              <div
                className={
                  styles.infoIcon
                }
              >
                <CheckCircle2
                  size={18}
                />
              </div>

              <span>
                Paid At
              </span>

              <strong>
                {order.paid_at
                  ? formatDateTime(
                      order.paid_at
                    )
                  : "Not paid"}
              </strong>
            </div>
          </section>

          {/* PRODUCTS */}

          <section
            className={
              styles.itemsCard
            }
          >
            <div
              className={
                styles.sectionHeader
              }
            >
              <div>
                <h2>
                  Order Items
                </h2>

                <p>
                  Products included in
                  this order.
                </p>
              </div>

              <span>
                {
                  order.items?.length ||
                  0
                } items
              </span>
            </div>

            <div
              className={
                styles.itemsList
              }
            >
              {order.items?.map(
                (item) => (
                  <div
                    key={
                      item.product_id
                    }
                    className={
                      styles.orderItem
                    }
                  >
                    <div
                      className={
                        styles.productIcon
                      }
                    >
                      <Package
                        size={18}
                      />
                    </div>

                    <div
                      className={
                        styles.productInfo
                      }
                    >
                      <strong>
                        {
                          item.product_name
                        }
                      </strong>

                      <span>
                        Qty:{" "}
                        {
                          item.quantity
                        }
                      </span>
                    </div>

                    <div
                      className={
                        styles.unitPrice
                      }
                    >
                      <span>
                        Unit Price
                      </span>

                      <strong>
                        {formatMoney(
                          item.unit_price_ghs
                        )}
                      </strong>
                    </div>

                    <div
                      className={
                        styles.lineTotal
                      }
                    >
                      <span>
                        Total
                      </span>

                      <strong>
                        {formatMoney(
                          item.line_total_ghs
                        )}
                      </strong>
                    </div>
                  </div>
                )
              )}
            </div>

            <div
              className={
                styles.orderTotal
              }
            >
              <span>
                Order Total
              </span>

              <strong>
                {formatMoney(
                  order.total_ghs
                )}
              </strong>
            </div>
          </section>

          {/* STATUS UPDATE */}

          <section
            className={
              styles.statusCard
            }
          >
            <div>
              <h2>
                Update Order Status
              </h2>

              <p>
                Change the current status
                of this order.
              </p>
            </div>

            <div
              className={
                styles.statusActions
              }
            >
              <input
                type="text"
                value={newStatus}
                onChange={(event) =>
                  setNewStatus(
                    event.target
                      .value
                  )
                }
                className={
                  styles.statusInput
                }
                placeholder="Order status"
              />

              <button
                type="button"
                className={
                  styles.saveButton
                }
                onClick={
                  updateStatus
                }
                disabled={
                  updating ||
                  !newStatus.trim()
                }
              >
                <Save size={17} />

                {updating
                  ? "Updating..."
                  : "Update Status"}
              </button>
            </div>
          </section>
        </div>
      </main>

      <Footer />
    </>
  );
}