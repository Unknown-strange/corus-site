"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  Clock3,
  UserRound,
  Check,
  X,
  Camera,
  Package,
  CheckCircle2,
  XCircle,
  RefreshCw,
  RotateCcw,
} from "lucide-react";

import NavbarAdmin from "@/components/NavbarAdmin";
import Footer from "@/components/Footer";

import styles from "./page.module.css";

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:8000";

/* =========================================================
   TYPES
========================================================= */

type RentalType = "studio" | "gadget";

type ReservationStatus =
  | "pending"
  | "approved"
  | "rejected";

type GadgetStatus =
  | "pending"
  | "active"
  | "approved"
  | "completed"
  | "returned"
  | "rejected";

type StudioReservation = {
  id: string;
  user_id: string;
  customer_email: string;
  customer_name: string;
  status: ReservationStatus;
  requested_start: string;
  requested_end: string;
  purpose: string;
  notes: string;
  approved_price_ghs: string;
  deposit_amount_ghs: string;
  balance_due_ghs: string;
  approved_at: string | null;
  payment_deadline: string | null;
  paystack_reference: string | null;
  rejection_reason: string | null;
  created_at: string;
  updated_at: string;
};

type GadgetRental = {
  id: string;
  user_id: string;
  equipment_id: string;
  equipment_name: string;
  status: string;
  start_date: string;
  end_date: string;
  rental_days: number;
  total_price_ghs: string;
  paystack_reference: string | null;
  paid_at: string | null;
  returned_at: string | null;
  created_at: string;
};

type CustomerResponse = {
  id: string;
  email: string;
  username: string;
  first_name: string;
  last_name: string;
};

/* =========================================================
   HELPERS
========================================================= */

function formatMoney(value: string | number) {
  const amount = Number(value);

  if (Number.isNaN(amount)) {
    return `GH₵${value}`;
  }

  return `GH₵${amount.toLocaleString("en-GH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatDate(value: string) {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString("en-GH", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatTime(value: string) {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleTimeString("en-GH", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function formatDateRange(
  start: string,
  end: string
) {
  if (!start || !end) {
    return "—";
  }

  return `${formatDate(start)} – ${formatDate(
    end
  )}`;
}

function shortUserId(id: string) {
  if (!id) return "Unknown customer";

  return `Customer ${id.slice(0, 8)}`;
}

/* =========================================================
   PAGE
========================================================= */

export default function RentalsPage() {
  const [activeTab, setActiveTab] =
    useState<RentalType>("studio");

  const [reservations, setReservations] =
    useState<StudioReservation[]>([]);

  const [gadgetRentals, setGadgetRentals] =
    useState<GadgetRental[]>([]);

  const [customerNames, setCustomerNames] =
    useState<Record<string, string>>({});

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [error, setError] =
    useState<string | null>(null);

  const [actionId, setActionId] =
    useState<string | null>(null);

  /* =======================================================
     AUTH
  ======================================================= */

  const getToken = () => {
    const token =
      localStorage.getItem(
        "access_token"
      );

    if (!token) {
      window.location.href = "/login";
      return null;
    }

    return token;
  };

  /* =======================================================
     FETCH CUSTOMER
     Gadget rental response only contains user_id,
     so we enrich it with the customer endpoint.
  ======================================================= */

  const fetchCustomerName = useCallback(
    async (
      userId: string,
      token: string
    ) => {
      try {
        const response = await fetch(
          `${API_BASE}/admin/customers/${userId}`,
          {
            headers: {
              Authorization:
                `Bearer ${token}`,
              Accept:
                "application/json",
            },
          }
        );

        if (!response.ok) {
          return null;
        }

        const data =
          (await response.json()) as CustomerResponse;

        const fullName =
          `${data.first_name || ""} ${
            data.last_name || ""
          }`.trim();

        return (
          fullName ||
          data.username ||
          data.email ||
          null
        );
      } catch {
        return null;
      }
    },
    []
  );

  /* =======================================================
     FETCH STUDIO RESERVATIONS
  ======================================================= */

  const fetchReservations =
    useCallback(
      async (token: string) => {
        const response =
          await fetch(
            `${API_BASE}/admin/reservations?page=1&limit=100`,
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
          throw new Error(
            "Failed to load studio reservations."
          );
        }

        const data =
          await response.json();

        setReservations(
          Array.isArray(data?.items)
            ? data.items
            : []
        );
      },
      []
    );

  /* =======================================================
     FETCH GADGET RENTALS
  ======================================================= */

  const fetchGadgetRentals =
    useCallback(
      async (token: string) => {
        const response =
          await fetch(
            `${API_BASE}/admin/rentals?page=1&limit=100`,
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
          throw new Error(
            "Failed to load gadget rentals."
          );
        }

        const data =
          await response.json();

        const items: GadgetRental[] =
          Array.isArray(data?.items)
            ? data.items
            : [];

        setGadgetRentals(items);

        /*
         * Enrich user IDs with customer names.
         */
        const uniqueUserIds = [
          ...new Set(
            items
              .map(
                (item) =>
                  item.user_id
              )
              .filter(Boolean)
          ),
        ];

        const nameEntries =
          await Promise.all(
            uniqueUserIds.map(
              async (userId) => {
                const name =
                  await fetchCustomerName(
                    userId,
                    token
                  );

                return [
                  userId,
                  name ||
                    shortUserId(
                      userId
                    ),
                ] as const;
              }
            )
          );

        setCustomerNames(
          Object.fromEntries(
            nameEntries
          )
        );
      },
      [fetchCustomerName]
    );

  /* =======================================================
     LOAD ALL DATA
  ======================================================= */

  const loadData = useCallback(
    async (
      showFullLoader = true
    ) => {
      try {
        if (showFullLoader) {
          setLoading(true);
        }

        setError(null);

        const token =
          getToken();

        if (!token) {
          return;
        }

        await Promise.all([
          fetchReservations(token),
          fetchGadgetRentals(token),
        ]);
      } catch (err) {
        console.error(err);

        setError(
          err instanceof Error
            ? err.message
            : "Failed to load rental data."
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [
      fetchReservations,
      fetchGadgetRentals,
    ]
  );

  useEffect(() => {
    loadData();
  }, [loadData]);

  /* =======================================================
     REFRESH
  ======================================================= */

  const handleRefresh = async () => {
    setRefreshing(true);

    await loadData(false);
  };

  /* =======================================================
     STUDIO APPROVE
  ======================================================= */

  const handleApprove =
    async (
      reservation: StudioReservation
    ) => {
      const priceInput =
        window.prompt(
          `Enter the approved price for ${reservation.customer_name} (GH₵):`,
          reservation.approved_price_ghs ||
            ""
        );

      if (
        priceInput === null
      ) {
        return;
      }

      const approvedPrice =
        Number(priceInput);

      if (
        !Number.isFinite(
          approvedPrice
        ) ||
        approvedPrice < 0
      ) {
        window.alert(
          "Please enter a valid approved price."
        );
        return;
      }

      const token =
        getToken();

      if (!token) return;

      try {
        setActionId(
          reservation.id
        );
        setError(null);

        const response =
          await fetch(
            `${API_BASE}/admin/reservations/${reservation.id}/approve`,
            {
              method: "PATCH",
              headers: {
                Authorization:
                  `Bearer ${token}`,
                "Content-Type":
                  "application/json",
                Accept:
                  "application/json",
              },
              body: JSON.stringify({
                approved_price_ghs:
                  approvedPrice,
              }),
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
          const errorData =
            await response
              .json()
              .catch(() => null);

          throw new Error(
            errorData?.detail ||
              "Failed to approve reservation."
          );
        }

        const updated =
          (await response.json()) as StudioReservation;

        setReservations(
          (current) =>
            current.map(
              (item) =>
                item.id ===
                reservation.id
                  ? updated
                  : item
            )
        );
      } catch (err) {
        console.error(err);

        setError(
          err instanceof Error
            ? err.message
            : "Failed to approve reservation."
        );
      } finally {
        setActionId(null);
      }
    };

  /* =======================================================
     STUDIO REJECT
  ======================================================= */

  const handleReject =
    async (
      reservation: StudioReservation
    ) => {
      const reason =
        window.prompt(
          "Enter the reason for rejecting this reservation:"
        );

      if (
        reason === null
      ) {
        return;
      }

      const trimmedReason =
        reason.trim();

      if (
        !trimmedReason
      ) {
        window.alert(
          "A rejection reason is required."
        );
        return;
      }

      const token =
        getToken();

      if (!token) return;

      try {
        setActionId(
          reservation.id
        );
        setError(null);

        const response =
          await fetch(
            `${API_BASE}/admin/reservations/${reservation.id}/reject`,
            {
              method: "PATCH",
              headers: {
                Authorization:
                  `Bearer ${token}`,
                "Content-Type":
                  "application/json",
                Accept:
                  "application/json",
              },
              body: JSON.stringify({
                rejection_reason:
                  trimmedReason,
              }),
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
          const errorData =
            await response
              .json()
              .catch(() => null);

          throw new Error(
            errorData?.detail ||
              "Failed to reject reservation."
          );
        }

        const updated =
          (await response.json()) as StudioReservation;

        setReservations(
          (current) =>
            current.map(
              (item) =>
                item.id ===
                reservation.id
                  ? updated
                  : item
            )
        );
      } catch (err) {
        console.error(err);

        setError(
          err instanceof Error
            ? err.message
            : "Failed to reject reservation."
        );
      } finally {
        setActionId(null);
      }
    };

  /* =======================================================
     MARK GADGET RETURNED
  ======================================================= */

  const handleReturned =
    async (
      rental: GadgetRental
    ) => {
      const confirmed =
        window.confirm(
          `Mark "${rental.equipment_name}" as returned?`
        );

      if (!confirmed) {
        return;
      }

      const token =
        getToken();

      if (!token) return;

      try {
        setActionId(
          rental.id
        );
        setError(null);

        const response =
          await fetch(
            `${API_BASE}/admin/rentals/${rental.id}/returned`,
            {
              method: "PATCH",
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
          const errorData =
            await response
              .json()
              .catch(() => null);

          throw new Error(
            errorData?.detail ||
              "Failed to mark rental as returned."
          );
        }

        const updated =
          (await response.json()) as GadgetRental;

        setGadgetRentals(
          (current) =>
            current.map(
              (item) =>
                item.id ===
                rental.id
                  ? updated
                  : item
            )
        );
      } catch (err) {
        console.error(err);

        setError(
          err instanceof Error
            ? err.message
            : "Failed to mark rental as returned."
        );
      } finally {
        setActionId(null);
      }
    };

  /* =======================================================
     STATS
  ======================================================= */

  const studioPending =
    reservations.filter(
      (item) =>
        item.status ===
        "pending"
    ).length;

  const studioApproved =
    reservations.filter(
      (item) =>
        item.status ===
        "approved"
    ).length;

  const studioRejected =
    reservations.filter(
      (item) =>
        item.status ===
        "rejected"
    ).length;

  const gadgetPending =
    gadgetRentals.filter(
      (item) =>
        item.status.toLowerCase() ===
        "pending"
    ).length;

  const gadgetActive =
    gadgetRentals.filter(
      (item) => {
        const status =
          item.status.toLowerCase();

        return (
          status ===
            "active" ||
          status ===
            "approved"
        );
      }
    ).length;

  const gadgetReturned =
    gadgetRentals.filter(
      (item) =>
        item.status.toLowerCase() ===
          "returned" ||
        Boolean(
          item.returned_at
        )
    ).length;

  /* =======================================================
     DISPLAY DATA
  ======================================================= */

  const studioItems =
    useMemo(
      () =>
        reservations,
      [reservations]
    );

  const gadgetItems =
    useMemo(
      () =>
        gadgetRentals,
      [gadgetRentals]
    );

  return (
    <>
      <NavbarAdmin />

      <main
        className={styles.page}
      >
        <div
          className={
            styles.container
          }
        >

          {/* =================================================
              HERO
          ================================================= */}

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
                Rental requests
              </h1>

              <p
                className={
                  styles.subtitle
                }
              >
                Review incoming studio reservations
                and equipment rentals, approve new
                requests, and track returned equipment.
              </p>
            </div>

            <div
              className={
                styles.heroStats
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
                  {activeTab ===
                  "studio" ? (
                    <Camera
                      size={20}
                    />
                  ) : (
                    <Package
                      size={20}
                    />
                  )}
                </div>

                <div>
                  <strong>
                    {activeTab ===
                    "studio"
                      ? studioItems.length
                      : gadgetItems.length}
                  </strong>

                  <span>
                    {activeTab ===
                    "studio"
                      ? "Reservations"
                      : "Rentals"}
                  </span>
                </div>
              </div>

              {activeTab ===
                "studio" ? (
                <>
                  <div
                    className={`${styles.smallStat} ${styles.pendingStat}`}
                  >
                    <span>
                      {
                        studioPending
                      }
                    </span>

                    <label>
                      Pending
                    </label>
                  </div>

                  <div
                    className={`${styles.smallStat} ${styles.approvedStat}`}
                  >
                    <span>
                      {
                        studioApproved
                      }
                    </span>

                    <label>
                      Approved
                    </label>
                  </div>

                  <div
                    className={`${styles.smallStat} ${styles.rejectedStat}`}
                  >
                    <span>
                      {
                        studioRejected
                      }
                    </span>

                    <label>
                      Rejected
                    </label>
                  </div>
                </>
              ) : (
                <>
                  <div
                    className={`${styles.smallStat} ${styles.pendingStat}`}
                  >
                    <span>
                      {
                        gadgetPending
                      }
                    </span>

                    <label>
                      Pending
                    </label>
                  </div>

                  <div
                    className={`${styles.smallStat} ${styles.approvedStat}`}
                  >
                    <span>
                      {
                        gadgetActive
                      }
                    </span>

                    <label>
                      Active
                    </label>
                  </div>

                  <div
                    className={`${styles.smallStat} ${styles.rejectedStat}`}
                  >
                    <span>
                      {
                        gadgetReturned
                      }
                    </span>

                    <label>
                      Returned
                    </label>
                  </div>
                </>
              )}
            </div>
          </section>

          {/* =================================================
              ERROR
          ================================================= */}

          {error && (
            <div
              style={{
                marginBottom:
                  "16px",
                padding:
                  "12px 14px",
                border:
                  "1px solid #fecdca",
                borderRadius:
                  "10px",
                background:
                  "#fff3f2",
                color:
                  "#b42318",
                fontSize:
                  "12px",
              }}
            >
              {error}
            </div>
          )}

          {/* =================================================
              CONTENT CARD
          ================================================= */}

          <section
            className={
              styles.rentalCard
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
                    {activeTab ===
                    "studio"
                      ? "Studio Reservations"
                      : "Equipment Rentals"}
                  </h2>

                  <span
                    className={
                      styles.requestBadge
                    }
                  >
                    {activeTab ===
                    "studio"
                      ? studioItems.length
                      : gadgetItems.length}{" "}
                    Total
                  </span>
                </div>

                <p>
                  {activeTab ===
                  "studio"
                    ? "Review customer requests for studio sessions."
                    : "Monitor equipment currently rented to customers."}
                </p>
              </div>

              <div
                style={{
                  display:
                    "flex",
                  alignItems:
                    "center",
                  gap: "8px",
                }}
              >
                <button
                  type="button"
                  onClick={
                    handleRefresh
                  }
                  disabled={
                    refreshing
                  }
                  style={{
                    display:
                      "inline-flex",
                    alignItems:
                      "center",
                    gap: "6px",
                    height:
                      "37px",
                    padding:
                      "0 11px",
                    border:
                      "1px solid #d0d5dd",
                    borderRadius:
                      "9px",
                    background:
                      "#fff",
                    color:
                      "#344054",
                    cursor:
                      "pointer",
                    fontFamily:
                      "inherit",
                    fontSize:
                      "10px",
                    fontWeight:
                      700,
                  }}
                >
                  <RefreshCw
                    size={15}
                    style={{
                      animation:
                        refreshing
                          ? "spin .8s linear infinite"
                          : undefined,
                    }}
                  />

                  Refresh
                </button>

                <div
                  className={
                    styles.tabs
                  }
                >
                  <button
                    type="button"
                    onClick={() =>
                      setActiveTab(
                        "studio"
                      )
                    }
                    className={`${styles.tab} ${
                      activeTab ===
                      "studio"
                        ? styles.activeTab
                        : ""
                    }`}
                  >
                    <Camera
                      size={15}
                    />

                    Studio
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      setActiveTab(
                        "gadget"
                      )
                    }
                    className={`${styles.tab} ${
                      activeTab ===
                      "gadget"
                        ? styles.activeTab
                        : ""
                    }`}
                  >
                    <Package
                      size={15}
                    />

                    Gadget
                  </button>
                </div>
              </div>
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
            ) : activeTab ===
              "studio" ? (
              /* =================================================
                  STUDIO LIST
              ================================================= */

              studioItems.length ===
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
                    <Camera
                      size={28}
                    />
                  </div>

                  <h3>
                    No studio reservations
                  </h3>

                  <p>
                    There are currently no
                    studio reservation requests
                    to review.
                  </p>
                </div>
              ) : (
                <div
                  className={
                    styles.list
                  }
                >
                  {studioItems.map(
                    (
                      reservation
                    ) => (
                      <article
                        key={
                          reservation.id
                        }
                        className={
                          styles.item
                        }
                      >
                        <div
                          className={
                            styles.customerIcon
                          }
                        >
                          <UserRound
                            size={20}
                          />
                        </div>

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
                            Customer
                          </span>

                          <h3
                            className={
                              styles.customerName
                            }
                          >
                            {
                              reservation.customer_name
                            }
                          </h3>

                          <span
                            className={
                              styles.service
                            }
                          >
                            {
                              reservation.purpose ||
                              "Studio session"
                            }
                          </span>
                        </div>

                        <div
                          className={
                            styles.meta
                          }
                        >
                          <CalendarDays
                            size={16}
                          />

                          <div>
                            <span>
                              Date
                            </span>

                            <strong>
                              {formatDate(
                                reservation.requested_start
                              )}
                            </strong>
                          </div>
                        </div>

                        <div
                          className={
                            styles.meta
                          }
                        >
                          <Clock3
                            size={16}
                          />

                          <div>
                            <span>
                              Time
                            </span>

                            <strong>
                              {formatTime(
                                reservation.requested_start
                              )}
                            </strong>
                          </div>
                        </div>

                        <div
                          className={
                            styles.statusArea
                          }
                        >
                          <span
                            className={`${styles.status} ${
                              styles[
                                reservation.status
                              ]
                            }`}
                          >
                            {reservation.status ===
                            "pending" ? (
                              <Clock3
                                size={12}
                              />
                            ) : reservation.status ===
                              "approved" ? (
                              <CheckCircle2
                                size={12}
                              />
                            ) : (
                              <XCircle
                                size={12}
                              />
                            )}

                            {reservation.status
                              .charAt(
                                0
                              )
                              .toUpperCase() +
                              reservation.status.slice(
                                1
                              )}
                          </span>
                        </div>

                        {reservation.status ===
                        "pending" ? (
                          <div
                            className={
                              styles.actions
                            }
                          >
                            <button
                              type="button"
                              className={
                                styles.rejectButton
                              }
                              disabled={
                                actionId ===
                                reservation.id
                              }
                              onClick={() =>
                                handleReject(
                                  reservation
                                )
                              }
                            >
                              <X
                                size={17}
                              />

                              Reject
                            </button>

                            <button
                              type="button"
                              className={
                                styles.approveButton
                              }
                              disabled={
                                actionId ===
                                reservation.id
                              }
                              onClick={() =>
                                handleApprove(
                                  reservation
                                )
                              }
                            >
                              <Check
                                size={17}
                              />

                              Approve
                            </button>
                          </div>
                        ) : (
                          <div
                            className={
                              styles.statusIcon
                            }
                          >
                            {reservation.status ===
                            "approved" ? (
                              <CheckCircle2
                                size={20}
                                color="#12b76a"
                              />
                            ) : (
                              <XCircle
                                size={20}
                                color="#d92d20"
                              />
                            )}
                          </div>
                        )}
                      </article>
                    )
                  )}
                </div>
              )
            ) : (
              /* =================================================
                  GADGET LIST
              ================================================= */

              gadgetItems.length ===
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
                    <Package
                      size={28}
                    />
                  </div>

                  <h3>
                    No equipment rentals
                  </h3>

                  <p>
                    There are currently no
                    equipment rentals to display.
                  </p>
                </div>
              ) : (
                <div
                  className={
                    styles.list
                  }
                >
                  {gadgetItems.map(
                    (rental) => {
                      const status =
                        rental.status.toLowerCase();

                      const isReturned =
                        Boolean(
                          rental.returned_at
                        ) ||
                        status ===
                          "returned";

                      const isActive =
                        status ===
                          "active" ||
                        status ===
                          "approved";

                      return (
                        <article
                          key={
                            rental.id
                          }
                          className={
                            styles.item
                          }
                        >
                          <div
                            className={
                              styles.customerIcon
                            }
                          >
                            <Package
                              size={20}
                            />
                          </div>

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
                              Customer
                            </span>

                            <h3
                              className={
                                styles.customerName
                              }
                            >
                              {customerNames[
                                rental
                                  .user_id
                              ] ||
                                shortUserId(
                                  rental.user_id
                                )}
                            </h3>

                            <span
                              className={
                                styles.service
                              }
                            >
                              {
                                rental.equipment_name
                              }
                            </span>
                          </div>

                          <div
                            className={
                              styles.meta
                            }
                          >
                            <CalendarDays
                              size={16}
                            />

                            <div>
                              <span>
                                Rental period
                              </span>

                              <strong>
                                {formatDateRange(
                                  rental.start_date,
                                  rental.end_date
                                )}
                              </strong>
                            </div>
                          </div>

                          <div
                            className={
                              styles.meta
                            }
                          >
                            <Clock3
                              size={16}
                            />

                            <div>
                              <span>
                                Duration
                              </span>

                              <strong>
                                {
                                  rental.rental_days
                                }{" "}
                                {rental.rental_days ===
                                1
                                  ? "day"
                                  : "days"}
                              </strong>
                            </div>
                          </div>

                          <div
                            className={
                              styles.statusArea
                            }
                          >
                            <span
                              className={`${styles.status} ${
                                isReturned
                                  ? styles.approved
                                  : isActive
                                  ? styles.approved
                                  : styles.pending
                              }`}
                            >
                              {isReturned ? (
                                <CheckCircle2
                                  size={12}
                                />
                              ) : isActive ? (
                                <CheckCircle2
                                  size={12}
                                />
                              ) : (
                                <Clock3
                                  size={12}
                                />
                              )}

                              {isReturned
                                ? "Returned"
                                : isActive
                                ? "Active"
                                : rental.status}
                            </span>
                          </div>

                          <div
                            className={
                              styles.actions
                            }
                          >
                            <span
                              style={{
                                color:
                                  "#101828",
                                fontSize:
                                  "11px",
                                fontWeight:
                                  700,
                                marginRight:
                                  "4px",
                              }}
                            >
                              {formatMoney(
                                rental.total_price_ghs
                              )}
                            </span>

                            {!isReturned &&
                              isActive && (
                                <button
                                  type="button"
                                  className={
                                    styles.approveButton
                                  }
                                  disabled={
                                    actionId ===
                                    rental.id
                                  }
                                  onClick={() =>
                                    handleReturned(
                                      rental
                                    )
                                  }
                                >
                                  <RotateCcw
                                    size={
                                      16
                                    }
                                  />

                                  Returned
                                </button>
                              )}
                          </div>
                        </article>
                      );
                    }
                  )}
                </div>
              )
            )}
          </section>
        </div>
      </main>

      <Footer />
    </>
  );
}