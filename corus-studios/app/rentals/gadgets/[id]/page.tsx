"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";

import {
  ArrowLeft,
  CalendarDays,
  Clock3,
  CreditCard,
} from "lucide-react";

import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

import api from "@/lib/api";
import type { RentEquipment } from "@/lib/types";

import styles from "./page.module.css";

type PageProps = {
  params: Promise<{
    id: string;
  }>;
};

type ErrorResponse = {
  detail?: unknown;
  message?: unknown;
  error?: {
    code?: unknown;
    message?: unknown;
  };
};

function parseResponseBody(
  rawBody: string
): unknown {
  if (!rawBody) {
    return null;
  }

  try {
    return JSON.parse(rawBody);
  } catch {
    return rawBody;
  }
}

function getErrorMessage(
  data: unknown,
  fallback: string
): string {
  if (
    typeof data === "string" &&
    data.trim()
  ) {
    return data;
  }

  if (
    data &&
    typeof data === "object"
  ) {
    const errorData =
      data as ErrorResponse;

    if (
      typeof errorData.detail ===
      "string"
    ) {
      return errorData.detail;
    }

    if (
      Array.isArray(
        errorData.detail
      )
    ) {
      const messages =
        errorData.detail
          .map((item) => {
            if (
              item &&
              typeof item === "object" &&
              "msg" in item &&
              typeof (
                item as {
                  msg?: unknown;
                }
              ).msg === "string"
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
              message
            ): message is string =>
              Boolean(message)
          );

      if (messages.length > 0) {
        return messages.join(", ");
      }
    }

    if (
      typeof errorData.message ===
      "string"
    ) {
      return errorData.message;
    }

    if (
      typeof errorData.error?.message ===
      "string"
    ) {
      return errorData.error.message;
    }
  }

  return fallback;
}

export default function RentalGadgetPage({
  params,
}: PageProps) {
  const [rental, setRental] =
    useState<RentEquipment | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [loadError, setLoadError] =
    useState<string | null>(null);

  const [checkoutError, setCheckoutError] =
    useState<string | null>(null);

  const [actionLoading, setActionLoading] =
    useState(false);

  const [pickupDate, setPickupDate] =
    useState("");

  const [dropoffDate, setDropoffDate] =
    useState("");

  const [pickupTime, setPickupTime] =
    useState("");

  const [dropoffTime, setDropoffTime] =
    useState("");

  /* =========================================================
     LOAD RENTAL
  ========================================================= */

  useEffect(() => {
    let mounted = true;

    const loadRental = async () => {
      try {
        const { id } = await params;

        const response =
          await api.rentals.equipmentBySlug(id);

        const rawBody =
          await response.text();

        const data =
          parseResponseBody(rawBody);

        if (!response.ok) {
          throw new Error(
            getErrorMessage(
              data,
              "Rental equipment not found."
            )
          );
        }

        if (mounted) {
          setRental(data as RentEquipment);
          setLoadError(null);
        }
      } catch (err) {
        if (mounted) {
          setLoadError(
            err instanceof Error
              ? err.message
              : "Failed to load rental."
          );
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    loadRental();

    return () => {
      mounted = false;
    };
  }, [params]);

  /* =========================================================
     CONTINUE TO CHECKOUT

     Do NOT call /rentals/checkout here.

     The rental details are stored temporarily and the user
     is sent to the common /checkout page.
  ========================================================= */

  const handleCheckout = () => {
    if (!rental) {
      return;
    }

    const token =
      localStorage.getItem("access_token");

    if (!token) {
      setCheckoutError(
        "Please log in before checking out."
      );

      return;
    }

    if (
      !pickupDate ||
      !dropoffDate ||
      !pickupTime ||
      !dropoffTime
    ) {
      setCheckoutError(
        "Please select all pickup and drop-off details."
      );

      return;
    }

    if (dropoffDate < pickupDate) {
      setCheckoutError(
        "Drop-off date cannot be before the pickup date."
      );

      return;
    }

    if (
      dropoffDate === pickupDate &&
      dropoffTime <= pickupTime
    ) {
      setCheckoutError(
        "Drop-off time must be after pickup time."
      );

      return;
    }

    try {
      setActionLoading(true);
      setCheckoutError(null);

      const rentalCheckout = {
        equipment_id: rental.id,
        equipment_name: rental.name,
        image_url:
          rental.image_url ||
          "/images/placeholder.png",
        daily_rate_ghs:
          rental.daily_rate_ghs,
        start_date: pickupDate,
        end_date: dropoffDate,
        pickup_time: pickupTime,
        dropoff_time: dropoffTime,
      };

      sessionStorage.setItem(
        "rental_checkout",
        JSON.stringify(rentalCheckout)
      );

      window.location.href = "/checkout";
    } catch (err) {
      console.error(
        "RENTAL CHECKOUT PREPARATION FAILED",
        err
      );

      setCheckoutError(
        "Unable to prepare rental checkout."
      );

      setActionLoading(false);
    }
  };

  /* =========================================================
     LOADING
  ========================================================= */

  if (loading) {
    return (
      <>
        <Navbar />

        <main className={styles.page}>
          <div className={styles.loading}>
            Loading rental...
          </div>
        </main>

        <Footer />
      </>
    );
  }

  /* =========================================================
     RENTAL LOAD ERROR
  ========================================================= */

  if (!rental) {
    return (
      <>
        <Navbar />

        <main className={styles.page}>
          <div className={styles.errorCard}>
            <h1>
              Rental unavailable
            </h1>

            <p>
              {loadError ||
                "This rental could not be found."}
            </p>

            <Link
              href="/rentals"
              className={styles.backLink}
            >
              <ArrowLeft size={17} />
              Back to Rentals
            </Link>
          </div>
        </main>

        <Footer />
      </>
    );
  }

  /* =========================================================
     RENTAL DATA
  ========================================================= */

  const dailyRate =
    Number.parseFloat(
      rental.daily_rate_ghs
    );

  const today =
    new Date()
      .toISOString()
      .split("T")[0];

  const available =
    rental.stock > 0;

  return (
    <>
      <Navbar />

      <main className={styles.page}>
        <div className={styles.container}>
          <Link
            href="/rentals"
            className={styles.backLink}
          >
            <ArrowLeft size={17} />
            Back to Rentals
          </Link>

          <section className={styles.rentalCard}>
            {/* IMAGE */}

            <div className={styles.imageWrap}>
              <Image
                src={
                  rental.image_url ||
                  "/images/placeholder.png"
                }
                alt={rental.name}
                fill
                sizes="(max-width: 800px) 100vw, 50vw"
                className={styles.image}
                priority
              />
            </div>

            {/* CONTENT */}

            <div className={styles.content}>
              <span className={styles.badge}>
                Rental Equipment
              </span>

              <h1>
                {rental.name}
              </h1>

              <p className={styles.description}>
                {rental.description}
              </p>

              <div className={styles.price}>
                GH₵
                {dailyRate.toLocaleString(
                  "en-GH",
                  {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  }
                )}

                <span>
                  /day
                </span>
              </div>

              <span className={styles.stock}>
                {available
                  ? `${rental.stock} available`
                  : "Currently unavailable"}
              </span>

              {available && (
                <>
                  <div className={styles.fields}>
                    <div className={styles.field}>
                      <label htmlFor="pickup-date">
                        <CalendarDays size={15} />
                        Pickup Date
                      </label>

                      <input
                        id="pickup-date"
                        type="date"
                        min={today}
                        value={pickupDate}
                        onChange={(event) => {
                          setPickupDate(
                            event.target.value
                          );
                          setCheckoutError(null);
                        }}
                      />
                    </div>

                    <div className={styles.field}>
                      <label htmlFor="dropoff-date">
                        <CalendarDays size={15} />
                        Drop-off Date
                      </label>

                      <input
                        id="dropoff-date"
                        type="date"
                        min={
                          pickupDate ||
                          today
                        }
                        value={dropoffDate}
                        onChange={(event) => {
                          setDropoffDate(
                            event.target.value
                          );
                          setCheckoutError(null);
                        }}
                      />
                    </div>

                    <div className={styles.field}>
                      <label htmlFor="pickup-time">
                        <Clock3 size={15} />
                        Pickup Time
                      </label>

                      <input
                        id="pickup-time"
                        type="time"
                        value={pickupTime}
                        onChange={(event) => {
                          setPickupTime(
                            event.target.value
                          );
                          setCheckoutError(null);
                        }}
                      />
                    </div>

                    <div className={styles.field}>
                      <label htmlFor="dropoff-time">
                        <Clock3 size={15} />
                        Drop-off Time
                      </label>

                      <input
                        id="dropoff-time"
                        type="time"
                        value={dropoffTime}
                        onChange={(event) => {
                          setDropoffTime(
                            event.target.value
                          );
                          setCheckoutError(null);
                        }}
                      />
                    </div>
                  </div>

                  {checkoutError && (
                    <div className={styles.error}>
                      {checkoutError}
                    </div>
                  )}

                  <button
                    type="button"
                    className={styles.checkout}
                    disabled={actionLoading}
                    onClick={handleCheckout}
                  >
                    <CreditCard size={18} />

                    {actionLoading
                      ? "Preparing checkout..."
                      : "Continue to Checkout"}
                  </button>
                </>
              )}

              {!available && (
                <div className={styles.error}>
                  This equipment is currently
                  unavailable for rental.
                </div>
              )}
            </div>
          </section>
        </div>
      </main>

      <Footer />
    </>
  );
}