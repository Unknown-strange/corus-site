"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

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
  AlertTriangle,
  Info,
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

type RentalType =
  | "studio"
  | "gadget";

type ReservationStatus =
  | "pending"
  | "approved"
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

type ModalType =
  | "approve"
  | "reject"
  | "returned"
  | "error"
  | null;

/* =========================================================
   HELPERS
========================================================= */

function formatMoney(
  value: string | number
) {
  const amount = Number(value);

  if (!Number.isFinite(amount)) {
    return `GH₵${value}`;
  }

  return `GH₵${amount.toLocaleString(
    "en-GH",
    {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }
  )}`;
}

function formatDate(
  value: string
) {
  if (!value) return "—";

  const date = new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return value;
  }

  return date.toLocaleDateString(
    "en-GH",
    {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }
  );
}

function formatTime(
  value: string
) {
  if (!value) return "—";

  const date = new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return value;
  }

  return date.toLocaleTimeString(
    "en-GH",
    {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    }
  );
}

function formatDateRange(
  start: string,
  end: string
) {
  if (!start || !end) {
    return "—";
  }

  return `${formatDate(
    start
  )} – ${formatDate(end)}`;
}

function shortUserId(
  id: string
) {
  if (!id) {
    return "Unknown customer";
  }

  return `Customer ${id.slice(
    0,
    8
  )}`;
}

function getErrorMessage(
  data: unknown,
  fallback: string
) {
  if (
    typeof data ===
      "string" &&
    data.trim()
  ) {
    return data;
  }

  if (
    data &&
    typeof data ===
      "object"
  ) {
    const value =
      data as {
        detail?: unknown;
        message?: unknown;
        error?: {
          message?: unknown;
        };
      };

    if (
      typeof value.detail ===
      "string"
    ) {
      return value.detail;
    }

    if (
      Array.isArray(
        value.detail
      )
    ) {
      const messages =
        value.detail
          .map((item) => {
            if (
              item &&
              typeof item ===
                "object" &&
              "msg" in item &&
              typeof (
                item as {
                  msg?: unknown;
                }
              ).msg ===
                "string"
            ) {
              return (
                item as {
                  msg: string;
                }
              ).msg;
            }

            return null;
          })
          .filter(
            (
              item
            ): item is string =>
              Boolean(item)
          );

      if (
        messages.length > 0
      ) {
        return messages.join(
          ", "
        );
      }
    }

    if (
      typeof value.message ===
      "string"
    ) {
      return value.message;
    }

    if (
      typeof value.error
        ?.message ===
      "string"
    ) {
      return value.error
        .message;
    }
  }

  return fallback;
}

async function getResponseData(
  response: Response
) {
  const raw =
    await response.text();

  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(
      raw
    );
  } catch {
    return raw;
  }
}

/* =========================================================
   PAGE
========================================================= */

export default function RentalsPage() {
  const [
    activeTab,
    setActiveTab,
  ] =
    useState<RentalType>(
      "studio"
    );

  const [
    reservations,
    setReservations,
  ] =
    useState<
      StudioReservation[]
    >([]);

  const [
    gadgetRentals,
    setGadgetRentals,
  ] =
    useState<GadgetRental[]>(
      []
    );

  const [
    customerNames,
    setCustomerNames,
  ] =
    useState<
      Record<string, string>
    >({});

  const [
    loading,
    setLoading,
  ] =
    useState(true);

  const [
    refreshing,
    setRefreshing,
  ] =
    useState(false);

  const [
    error,
    setError,
  ] =
    useState<string | null>(
      null
    );

  const [
    actionId,
    setActionId,
  ] =
    useState<string | null>(
      null
    );

  /* =========================================================
     MODAL STATE
  ========================================================= */

  const [
    modalType,
    setModalType,
  ] =
    useState<ModalType>(
      null
    );

  const [
    modalReservation,
    setModalReservation,
  ] =
    useState<
      StudioReservation | null
    >(null);

  const [
    modalRental,
    setModalRental,
  ] =
    useState<
      GadgetRental | null
    >(null);

  const [
    approvedPrice,
    setApprovedPrice,
  ] =
    useState("");

  const [
    rejectionReason,
    setRejectionReason,
  ] =
    useState("");

  const [
    modalError,
    setModalError,
  ] =
    useState<string | null>(
      null
    );

  /* =========================================================
     MODAL HELPERS
  ========================================================= */

  const closeModal = () => {
    if (actionId) {
      return;
    }

    setModalType(
      null
    );

    setModalReservation(
      null
    );

    setModalRental(
      null
    );

    setApprovedPrice(
      ""
    );

    setRejectionReason(
      ""
    );

    setModalError(
      null
    );
  };

  const openErrorModal = (
    message: string
  ) => {
    setModalType(
      "error"
    );

    setModalError(
      message
    );
  };

  /* =========================================================
     AUTH
  ========================================================= */

  const getToken = () => {
    const token =
      localStorage.getItem(
        "access_token"
      );

    if (!token) {
      window.location.href =
        "/login";

      return null;
    }

    return token;
  };

  /* =========================================================
     FETCH CUSTOMER
  ========================================================= */

  const fetchCustomerName =
    useCallback(
      async (
        userId: string,
        token: string
      ) => {
        try {
          const response =
            await fetch(
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

  /* =========================================================
     FETCH STUDIO RESERVATIONS
  ========================================================= */

  const fetchReservations =
    useCallback(
      async (
        token: string
      ) => {
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

        const data =
          await getResponseData(
            response
          );

        if (!response.ok) {
          throw new Error(
            getErrorMessage(
              data,
              `Failed to load studio reservations (${response.status}).`
            )
          );
        }

        setReservations(
          Array.isArray(
            (
              data as {
                items?: unknown;
              }
            )?.items
          )
            ? (
                data as {
                  items: StudioReservation[];
                }
              ).items
            : []
        );
      },
      []
    );

  /* =========================================================
     FETCH GADGET RENTALS
  ========================================================= */

  const fetchGadgetRentals =
    useCallback(
      async (
        token: string
      ) => {
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

        const data =
          await getResponseData(
            response
          );

        if (!response.ok) {
          throw new Error(
            getErrorMessage(
              data,
              `Failed to load gadget rentals (${response.status}).`
            )
          );
        }

        const items: GadgetRental[] =
          Array.isArray(
            (
              data as {
                items?: unknown;
              }
            )?.items
          )
            ? (
                data as {
                  items: GadgetRental[];
                }
              ).items
            : [];

        setGadgetRentals(
          items
        );

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
              async (
                userId
              ) => {
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
      [
        fetchCustomerName,
      ]
    );

  /* =========================================================
     LOAD ALL DATA
  ========================================================= */

  const loadData =
    useCallback(
      async (
        showFullLoader = true
      ) => {
        try {
          if (
            showFullLoader
          ) {
            setLoading(
              true
            );
          }

          setError(
            null
          );

          const token =
            getToken();

          if (!token) {
            return;
          }

          await Promise.all([
            fetchReservations(
              token
            ),
            fetchGadgetRentals(
              token
            ),
          ]);
        } catch (
          err
        ) {
          console.error(
            "RENTALS LOAD FAILED",
            err
          );

          setError(
            err instanceof Error
              ? err.message
              : "Failed to load rental data."
          );
        } finally {
          setLoading(
            false
          );

          setRefreshing(
            false
          );
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

  /* =========================================================
     REFRESH
  ========================================================= */

  const handleRefresh =
    async () => {
      setRefreshing(
        true
      );

      await loadData(
        false
      );
    };

  /* =========================================================
     OPEN APPROVE
  ========================================================= */

  const openApproveModal =
    (
      reservation: StudioReservation
    ) => {
      setModalReservation(
        reservation
      );

      setApprovedPrice(
        reservation.approved_price_ghs ||
          ""
      );

      setModalError(
        null
      );

      setModalType(
        "approve"
      );
    };

  /* =========================================================
     OPEN REJECT
  ========================================================= */

  const openRejectModal =
    (
      reservation: StudioReservation
    ) => {
      setModalReservation(
        reservation
      );

      setRejectionReason(
        ""
      );

      setModalError(
        null
      );

      setModalType(
        "reject"
      );
    };

  /* =========================================================
     OPEN RETURN
  ========================================================= */

  const openReturnedModal =
    (
      rental: GadgetRental
    ) => {
      setModalRental(
        rental
      );

      setModalError(
        null
      );

      setModalType(
        "returned"
      );
    };

  /* =========================================================
     APPROVE RESERVATION
  ========================================================= */

  const confirmApprove =
    async () => {
      if (
        !modalReservation
      ) {
        return;
      }

      const price =
        Number(
          approvedPrice
        );

      if (
        !Number.isFinite(
          price
        ) ||
        price < 0
      ) {
        setModalError(
          "Please enter a valid approved price."
        );

        return;
      }

      const token =
        getToken();

      if (!token) {
        return;
      }

      try {
        setActionId(
          modalReservation.id
        );

        setModalError(
          null
        );

        const response =
          await fetch(
            `${API_BASE}/admin/reservations/${modalReservation.id}/approve`,
            {
              method:
                "PATCH",

              headers: {
                Authorization:
                  `Bearer ${token}`,

                "Content-Type":
                  "application/json",

                Accept:
                  "application/json",
              },

              body:
                JSON.stringify({
                  approved_price_ghs:
                    price,
                }),
            }
          );

        const data =
          await getResponseData(
            response
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
            getErrorMessage(
              data,
              `Failed to approve reservation (${response.status}).`
            )
          );
        }

        const updated =
          data as StudioReservation;

        setReservations(
          (
            current
          ) =>
            current.map(
              (
                item
              ) =>
                item.id ===
                modalReservation.id
                  ? updated
                  : item
            )
        );

        closeModal();
      } catch (
        err
      ) {
        console.error(
          "APPROVE RESERVATION FAILED",
          err
        );

        setModalError(
          err instanceof Error
            ? err.message
            : "Failed to approve reservation."
        );
      } finally {
        setActionId(
          null
        );
      }
    };

  /* =========================================================
     REJECT RESERVATION
  ========================================================= */

  const confirmReject =
    async () => {
      if (
        !modalReservation
      ) {
        return;
      }

      const reason =
        rejectionReason.trim();

      if (!reason) {
        setModalError(
          "A rejection reason is required."
        );

        return;
      }

      const token =
        getToken();

      if (!token) {
        return;
      }

      try {
        setActionId(
          modalReservation.id
        );

        setModalError(
          null
        );

        const response =
          await fetch(
            `${API_BASE}/admin/reservations/${modalReservation.id}/reject`,
            {
              method:
                "PATCH",

              headers: {
                Authorization:
                  `Bearer ${token}`,

                "Content-Type":
                  "application/json",

                Accept:
                  "application/json",
              },

              body:
                JSON.stringify({
                  rejection_reason:
                    reason,
                }),
            }
          );

        const data =
          await getResponseData(
            response
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
            getErrorMessage(
              data,
              `Failed to reject reservation (${response.status}).`
            )
          );
        }

        const updated =
          data as StudioReservation;

        setReservations(
          (
            current
          ) =>
            current.map(
              (
                item
              ) =>
                item.id ===
                modalReservation.id
                  ? updated
                  : item
            )
        );

        closeModal();
      } catch (
        err
      ) {
        console.error(
          "REJECT RESERVATION FAILED",
          err
        );

        setModalError(
          err instanceof Error
            ? err.message
            : "Failed to reject reservation."
        );
      } finally {
        setActionId(
          null
        );
      }
    };

  /* =========================================================
     MARK RETURNED
  ========================================================= */

  const confirmReturned =
    async () => {
      if (
        !modalRental
      ) {
        return;
      }

      const token =
        getToken();

      if (!token) {
        return;
      }

      try {
        setActionId(
          modalRental.id
        );

        setModalError(
          null
        );

        const response =
          await fetch(
            `${API_BASE}/admin/rentals/${modalRental.id}/returned`,
            {
              method:
                "PATCH",

              headers: {
                Authorization:
                  `Bearer ${token}`,

                Accept:
                  "application/json",
              },
            }
          );

        const data =
          await getResponseData(
            response
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
            getErrorMessage(
              data,
              `Failed to mark rental as returned (${response.status}).`
            )
          );
        }

        const updated =
          data as GadgetRental;

        setGadgetRentals(
          (
            current
          ) =>
            current.map(
              (
                item
              ) =>
                item.id ===
                modalRental.id
                  ? updated
                  : item
            )
        );

        closeModal();
      } catch (
        err
      ) {
        console.error(
          "MARK RETURNED FAILED",
          err
        );

        setModalError(
          err instanceof Error
            ? err.message
            : "Failed to mark rental as returned."
        );
      } finally {
        setActionId(
          null
        );
      }
    };

  /* =========================================================
     STATS
  ========================================================= */

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
              HERO
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
                Review incoming studio
                reservations and equipment
                rentals, approve new requests,
                and track returned equipment.
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
              ERROR BANNER
          ================================================= */}

          {error && (
            <div
              className={
                styles.errorBanner
              }
            >
              <AlertTriangle
                size={18}
              />

              <div>
                <strong>
                  Something went wrong
                </strong>

                <span>
                  {error}
                </span>
              </div>

              <button
                type="button"
                onClick={() =>
                  setError(
                    null
                  )
                }
                aria-label="Dismiss error"
              >
                <X size={16} />
              </button>
            </div>
          )}

          {/* =================================================
              MAIN CARD
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
                className={
                  styles.headerControls
                }
              >
                <button
                  type="button"
                  onClick={
                    handleRefresh
                  }
                  disabled={
                    refreshing
                  }
                  className={
                    styles.refreshButton
                  }
                >
                  <RefreshCw
                    size={15}
                    className={
                      refreshing
                        ? styles.spin
                        : ""
                    }
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
                  STUDIO
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
                                openRejectModal(
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
                                openApproveModal(
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
                  GADGET
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
                                rental.user_id
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
                              {isReturned ||
                              isActive ? (
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
                              className={
                                styles.rentalPrice
                              }
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
                                    openReturnedModal(
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

      {/* =========================================================
          MODALS
      ========================================================= */}

      {modalType && (
        <div
          className={
            styles.modalOverlay
          }
          role="presentation"
          onMouseDown={(
            event
          ) => {
            if (
              event.target ===
              event.currentTarget
            ) {
              closeModal();
            }
          }}
        >
          <div
            className={
              styles.modal
            }
            role="dialog"
            aria-modal="true"
            aria-labelledby="rental-modal-title"
          >
            {/* =================================================
                APPROVE
            ================================================= */}

            {modalType ===
              "approve" &&
              modalReservation && (
                <>
                  <div
                    className={`${styles.modalIcon} ${styles.modalIconSuccess}`}
                  >
                    <CheckCircle2
                      size={26}
                    />
                  </div>

                  <h2
                    id="rental-modal-title"
                  >
                    Approve reservation
                  </h2>

                  <p
                    className={
                      styles.modalDescription
                    }
                  >
                    You're approving the studio
                    reservation for{" "}
                    <strong>
                      {
                        modalReservation.customer_name
                      }
                    </strong>
                    .
                  </p>

                  <div
                    className={
                      styles.modalInfoBox
                    }
                  >
                    <div>
                      <span>
                        Requested date
                      </span>

                      <strong>
                        {formatDate(
                          modalReservation.requested_start
                        )}
                      </strong>
                    </div>

                    <div>
                      <span>
                        Requested time
                      </span>

                      <strong>
                        {formatTime(
                          modalReservation.requested_start
                        )}
                      </strong>
                    </div>

                    <div>
                      <span>
                        Session
                      </span>

                      <strong>
                        {
                          modalReservation.purpose
                        }
                      </strong>
                    </div>
                  </div>

                  <label
                    className={
                      styles.modalField
                    }
                  >
                    <span>
                      Approved price
                    </span>

                    <div
                      className={
                        styles.currencyInput
                      }
                    >
                      <span>
                        GH₵
                      </span>

                      <input
                        type="number"
                        value={
                          approvedPrice
                        }
                        min="0"
                        step="0.01"
                        onChange={(
                          event
                        ) =>
                          setApprovedPrice(
                            event.target
                              .value
                          )
                        }
                        placeholder="0.00"
                        autoFocus
                      />
                    </div>
                  </label>

                  {modalError && (
                    <div
                      className={
                        styles.modalError
                      }
                    >
                      <AlertTriangle
                        size={16}
                      />

                      <span>
                        {
                          modalError
                        }
                      </span>
                    </div>
                  )}

                  <div
                    className={
                      styles.modalActions
                    }
                  >
                    <button
                      type="button"
                      className={
                        styles.cancelButton
                      }
                      onClick={
                        closeModal
                      }
                      disabled={
                        Boolean(
                          actionId
                        )
                      }
                    >
                      Cancel
                    </button>

                    <button
                      type="button"
                      className={
                        styles.confirmButton
                      }
                      onClick={
                        confirmApprove
                      }
                      disabled={
                        Boolean(
                          actionId
                        )
                      }
                    >
                      {actionId ? (
                        <>
                          <RefreshCw
                            size={15}
                            className={
                              styles.spin
                            }
                          />

                          Approving...
                        </>
                      ) : (
                        <>
                          <Check
                            size={16}
                          />

                          Approve Reservation
                        </>
                      )}
                    </button>
                  </div>
                </>
              )}

            {/* =================================================
                REJECT
            ================================================= */}

            {modalType ===
              "reject" &&
              modalReservation && (
                <>
                  <div
                    className={`${styles.modalIcon} ${styles.modalIconDanger}`}
                  >
                    <XCircle
                      size={26}
                    />
                  </div>

                  <h2
                    id="rental-modal-title"
                  >
                    Reject reservation
                  </h2>

                  <p
                    className={
                      styles.modalDescription
                    }
                  >
                    Please provide a reason for
                    rejecting{" "}
                    <strong>
                      {
                        modalReservation.customer_name
                      }
                    </strong>
                    's reservation.
                  </p>

                  <div
                    className={
                      styles.modalInfoBox
                    }
                  >
                    <div>
                      <span>
                        Date
                      </span>

                      <strong>
                        {formatDate(
                          modalReservation.requested_start
                        )}
                      </strong>
                    </div>

                    <div>
                      <span>
                        Session
                      </span>

                      <strong>
                        {
                          modalReservation.purpose
                        }
                      </strong>
                    </div>
                  </div>

                  <label
                    className={
                      styles.modalField
                    }
                  >
                    <span>
                      Rejection reason
                    </span>

                    <textarea
                      value={
                        rejectionReason
                      }
                      onChange={(
                        event
                      ) =>
                        setRejectionReason(
                          event.target
                            .value
                        )
                      }
                      placeholder="Explain why this reservation is being rejected..."
                      rows={4}
                      autoFocus
                    />
                  </label>

                  {modalError && (
                    <div
                      className={
                        styles.modalError
                      }
                    >
                      <AlertTriangle
                        size={16}
                      />

                      <span>
                        {
                          modalError
                        }
                      </span>
                    </div>
                  )}

                  <div
                    className={
                      styles.modalActions
                    }
                  >
                    <button
                      type="button"
                      className={
                        styles.cancelButton
                      }
                      onClick={
                        closeModal
                      }
                      disabled={
                        Boolean(
                          actionId
                        )
                      }
                    >
                      Cancel
                    </button>

                    <button
                      type="button"
                      className={
                        styles.dangerButton
                      }
                      onClick={
                        confirmReject
                      }
                      disabled={
                        Boolean(
                          actionId
                        )
                      }
                    >
                      {actionId ? (
                        <>
                          <RefreshCw
                            size={15}
                            className={
                              styles.spin
                            }
                          />

                          Rejecting...
                        </>
                      ) : (
                        <>
                          <X
                            size={16}
                          />

                          Reject Reservation
                        </>
                      )}
                    </button>
                  </div>
                </>
              )}

            {/* =================================================
                RETURN
            ================================================= */}

            {modalType ===
              "returned" &&
              modalRental && (
                <>
                  <div
                    className={`${styles.modalIcon} ${styles.modalIconSuccess}`}
                  >
                    <RotateCcw
                      size={26}
                    />
                  </div>

                  <h2
                    id="rental-modal-title"
                  >
                    Mark equipment as returned?
                  </h2>

                  <p
                    className={
                      styles.modalDescription
                    }
                  >
                    This will mark{" "}
                    <strong>
                      {
                        modalRental.equipment_name
                      }
                    </strong>{" "}
                    as returned.
                  </p>

                  <div
                    className={
                      styles.modalInfoBox
                    }
                  >
                    <div>
                      <span>
                        Customer
                      </span>

                      <strong>
                        {customerNames[
                          modalRental.user_id
                        ] ||
                          shortUserId(
                            modalRental.user_id
                          )}
                      </strong>
                    </div>

                    <div>
                      <span>
                        Rental period
                      </span>

                      <strong>
                        {formatDateRange(
                          modalRental.start_date,
                          modalRental.end_date
                        )}
                      </strong>
                    </div>

                    <div>
                      <span>
                        Rental total
                      </span>

                      <strong>
                        {formatMoney(
                          modalRental.total_price_ghs
                        )}
                      </strong>
                    </div>
                  </div>

                  {modalError && (
                    <div
                      className={
                        styles.modalError
                      }
                    >
                      <AlertTriangle
                        size={16}
                      />

                      <span>
                        {
                          modalError
                        }
                      </span>
                    </div>
                  )}

                  <div
                    className={
                      styles.modalActions
                    }
                  >
                    <button
                      type="button"
                      className={
                        styles.cancelButton
                      }
                      onClick={
                        closeModal
                      }
                      disabled={
                        Boolean(
                          actionId
                        )
                      }
                    >
                      Cancel
                    </button>

                    <button
                      type="button"
                      className={
                        styles.confirmButton
                      }
                      onClick={
                        confirmReturned
                      }
                      disabled={
                        Boolean(
                          actionId
                        )
                      }
                    >
                      {actionId ? (
                        <>
                          <RefreshCw
                            size={15}
                            className={
                              styles.spin
                            }
                          />

                          Updating...
                        </>
                      ) : (
                        <>
                          <CheckCircle2
                            size={16}
                          />

                          Mark Returned
                        </>
                      )}
                    </button>
                  </div>
                </>
              )}

            {/* =================================================
                ERROR
            ================================================= */}

            {modalType ===
              "error" && (
              <>
                <div
                  className={`${styles.modalIcon} ${styles.modalIconDanger}`}
                >
                  <AlertTriangle
                    size={26}
                  />
                </div>

                <h2
                  id="rental-modal-title"
                >
                  Something went wrong
                </h2>

                <p
                  className={
                    styles.modalDescription
                  }
                >
                  We couldn't complete that
                  action.
                </p>

                <div
                  className={
                    styles.modalErrorLarge
                  }
                >
                  {modalError ||
                    "An unexpected error occurred."}
                </div>

                <div
                  className={
                    styles.modalActions
                  }
                >
                  <button
                    type="button"
                    className={
                      styles.confirmButton
                    }
                    onClick={
                      closeModal
                    }
                  >
                    Close
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      <Footer />
    </>
  );
}