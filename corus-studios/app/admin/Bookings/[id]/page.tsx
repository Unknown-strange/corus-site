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
  CalendarDays,
  Clock3,
  UserRound,
  Camera,
  CheckCircle2,
  CreditCard,
  Wallet,
  Mail,
} from "lucide-react";

import NavbarAdmin from "@/components/NavbarAdmin";
import Footer from "@/components/Footer";

import styles from "./page.module.css";

type Booking = {
  id: string;
  user_id: string;
  status: string;
  deposit_amount_ghs: string;
  total_price_ghs: string;
  balance_due_ghs: string;
  session_type_name: string;
  slot_starts_at: string;
  slot_ends_at: string;
  confirmed_at: string | null;
  created_at: string;
};

type Customer = {
  id: string;
  email: string;
  username: string;
  first_name: string;
  last_name: string;
  is_active: boolean;
  email_verified: boolean;
  created_at: string;
};

type BookingsResponse = {
  items: Booking[];
  total: number;
  page: number;
  limit: number;
  pages: number;
};

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:8000";

function formatMoney(value: string) {
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
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function formatTime(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleTimeString("en-GH", {
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatDateTime(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString("en-GH", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function formatStatus(status: string) {
  return status
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (letter) =>
      letter.toUpperCase()
    );
}

function getStatusClass(status: string) {
  const normalized =
    status.toLowerCase();

  if (
    normalized.includes("confirm") ||
    normalized.includes("complete") ||
    normalized.includes("approved")
  ) {
    return styles.completed;
  }

  if (
    normalized.includes("cancel") ||
    normalized.includes("reject")
  ) {
    return styles.cancelled;
  }

  return styles.pending;
}

export default function BookingDetailPage() {
  const router = useRouter();
  const params = useParams();

  const id =
    params?.id as string;

  const [booking, setBooking] =
    useState<Booking | null>(null);

  const [customer, setCustomer] =
    useState<Customer | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState<string | null>(null);

  const goBack = () => {
    router.push(
      "/admin/Bookings"
    );
  };

  useEffect(() => {
    const fetchBookingDetails =
      async () => {
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

          /*
           * There is currently no:
           *
           * GET /admin/bookings/{booking_id}
           *
           * endpoint.
           *
           * So we retrieve the bookings collection
           * and find the requested booking.
           */

          const bookingResponse =
            await fetch(
              `${API_BASE}/admin/bookings?page=1&limit=100`,
              {
                headers: {
                  Authorization:
                    `Bearer ${token}`,
                },
              }
            );

          if (
            bookingResponse.status ===
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

          if (!bookingResponse.ok) {
            throw new Error(
              "Failed to load bookings."
            );
          }

          const bookingData: BookingsResponse =
            await bookingResponse.json();

          const foundBooking =
            bookingData.items.find(
              (item) =>
                item.id === id
            );

          if (!foundBooking) {
            setBooking(null);
            return;
          }

          setBooking(
            foundBooking
          );

          /*
           * The booking exposes user_id.
           * Use the customer endpoint to retrieve
           * the customer's actual name/email.
           */

          const customerResponse =
            await fetch(
              `${API_BASE}/admin/customers/${foundBooking.user_id}`,
              {
                headers: {
                  Authorization:
                    `Bearer ${token}`,
                },
              }
            );

          if (
            customerResponse.ok
          ) {
            const customerData: Customer =
              await customerResponse.json();

            setCustomer(
              customerData
            );
          }
        } catch (err) {
          console.error(err);

          setError(
            err instanceof Error
              ? err.message
              : "Failed to load booking."
          );
        } finally {
          setLoading(false);
        }
      };

    fetchBookingDetails();
  }, [id]);

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
                styles.loadingCard
              }
            >
              <div
                className={
                  styles.loadingSpinner
                }
              />

              <span>
                Loading booking details...
              </span>
            </div>
          </div>
        </main>

        <Footer />
      </>
    );
  }

  if (error || !booking) {
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
                styles.notFound
              }
            >
              <div
                className={
                  styles.notFoundIcon
                }
              >
                <CalendarDays
                  size={26}
                />
              </div>

              <h1>
                {error
                  ? "Unable to load booking"
                  : "Booking not found"}
              </h1>

              <p>
                {error ||
                  "The requested booking could not be found."}
              </p>

              <button
                type="button"
                className={
                  styles.backMainButton
                }
                onClick={
                  goBack
                }
              >
                <ArrowLeft size={17} />
                Back to Bookings
              </button>
            </div>
          </div>
        </main>

        <Footer />
      </>
    );
  }

  const customerName =
    customer
      ? `${customer.first_name} ${customer.last_name}`.trim()
      : "Customer";

  return (
    <>
      <NavbarAdmin />

      <main className={styles.page}>
        <div className={styles.container}>

          {/* =================================================
              HEADER
          ================================================= */}

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
              onClick={
                goBack
              }
              aria-label="Back to bookings"
            >
              <ArrowLeft
                size={19}
              />
            </button>

            <div>
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
                Booking details
              </h1>

              <p
                className={
                  styles.subtitle
                }
              >
                Review the customer,
                schedule and payment
                information.
              </p>
            </div>
          </section>

          {/* =================================================
              CUSTOMER / STATUS
          ================================================= */}

          <section
            className={
              styles.detailsCard
            }
          >
            <div
              className={
                styles.cardTop
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
                      styles.itemLabel
                    }
                  >
                    Customer
                  </span>

                  <h2>
                    {customerName}
                  </h2>

                  <span
                    className={
                      styles.bookingType
                    }
                  >
                    {
                      booking.session_type_name
                    }
                  </span>
                </div>
              </div>

              <span
                className={`${styles.status} ${
                  getStatusClass(
                    booking.status
                  )
                }`}
              >
                <CheckCircle2
                  size={14}
                />

                {formatStatus(
                  booking.status
                )}
              </span>
            </div>

            {/* =================================================
                SCHEDULE
            ================================================= */}

            <div
              className={
                styles.sectionHeading
              }
            >
              <h3>
                Session
              </h3>

              <p>
                Scheduled booking details.
              </p>
            </div>

            <div
              className={
                styles.detailsGrid
              }
            >
              <div
                className={
                  styles.detailBox
                }
              >
                <div
                  className={
                    styles.detailIcon
                  }
                >
                  <Camera
                    size={18}
                  />
                </div>

                <div>
                  <span>
                    Session Type
                  </span>

                  <strong>
                    {
                      booking.session_type_name
                    }
                  </strong>
                </div>
              </div>

              <div
                className={
                  styles.detailBox
                }
              >
                <div
                  className={
                    styles.detailIcon
                  }
                >
                  <CalendarDays
                    size={18}
                  />
                </div>

                <div>
                  <span>
                    Date
                  </span>

                  <strong>
                    {formatDate(
                      booking.slot_starts_at
                    )}
                  </strong>
                </div>
              </div>

              <div
                className={
                  styles.detailBox
                }
              >
                <div
                  className={
                    styles.detailIcon
                  }
                >
                  <Clock3 size={18} />
                </div>

                <div>
                  <span>
                    Time
                  </span>

                  <strong>
                    {formatTime(
                      booking.slot_starts_at
                    )}
                    {" – "}
                    {formatTime(
                      booking.slot_ends_at
                    )}
                  </strong>
                </div>
              </div>

              <div
                className={
                  styles.detailBox
                }
              >
                <div
                  className={
                    styles.detailIcon
                  }
                >
                  <Mail size={18} />
                </div>

                <div>
                  <span>
                    Email
                  </span>

                  <strong>
                    {customer?.email ||
                      "Not available"}
                  </strong>
                </div>
              </div>
            </div>

            {/* =================================================
                FINANCIALS
            ================================================= */}

            <div
              className={
                styles.sectionHeading
              }
            >
              <h3>
                Payment
              </h3>

              <p>
                Current financial state of
                this booking.
              </p>
            </div>

            <div
              className={
                styles.paymentGrid
              }
            >
              <div
                className={
                  styles.paymentBox
                }
              >
                <div
                  className={
                    styles.paymentIcon
                  }
                >
                  <CreditCard
                    size={18}
                  />
                </div>

                <span>
                  Total Price
                </span>

                <strong>
                  {formatMoney(
                    booking.total_price_ghs
                  )}
                </strong>
              </div>

              <div
                className={
                  styles.paymentBox
                }
              >
                <div
                  className={
                    styles.paymentIcon
                  }
                >
                  <CheckCircle2
                    size={18}
                  />
                </div>

                <span>
                  Deposit
                </span>

                <strong>
                  {formatMoney(
                    booking.deposit_amount_ghs
                  )}
                </strong>
              </div>

              <div
                className={
                  styles.paymentBox
                }
              >
                <div
                  className={
                    styles.paymentIcon
                  }
                >
                  <Wallet size={18} />
                </div>

                <span>
                  Balance Due
                </span>

                <strong
                  className={
                    styles.balance
                  }
                >
                  {formatMoney(
                    booking.balance_due_ghs
                  )}
                </strong>
              </div>
            </div>

            {/* =================================================
                METADATA
            ================================================= */}

            <div
              className={
                styles.metaFooter
              }
            >
              <div>
                <span>
                  Created
                </span>

                <strong>
                  {formatDateTime(
                    booking.created_at
                  )}
                </strong>
              </div>

              <div>
                <span>
                  Confirmed
                </span>

                <strong>
                  {booking.confirmed_at
                    ? formatDateTime(
                        booking.confirmed_at
                      )
                    : "Not confirmed"}
                </strong>
              </div>

              <div>
                <span>
                  Booking ID
                </span>

                <strong>
                  {booking.id}
                </strong>
              </div>
            </div>
          </section>
        </div>
      </main>

      <Footer />
    </>
  );
}