"use client";

import {
  useEffect,
  useState,
} from "react";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";

import {
  ArrowDown,
  ArrowLeft,
  CheckCircle2,
  Download,
  FileText,
  Mail,
  Phone,
  UserRound,
  Wallet,
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

type ReceiptLineItem = {
  description: string;
  quantity: number;
  unit_price_ghs: string;
  line_total_ghs: string;
  detail: string;
};

type ReceiptDetails = {
  id: string;
  receipt_number: string;
  receipt_type: string;
  amount_ghs: string;
  issued_at: string;

  line_items: ReceiptLineItem[];

  amount_paid_ghs: string;
  total_price_ghs: string;
  balance_due_ghs: string;

  payment_reference: string;

  customer_name: string;
  customer_email: string;
  customer_phone: string;
};

/* =========================================================
   HELPERS
========================================================= */

const formatMoney = (
  value: string | number
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

const formatDate = (
  value: string
) => {
  const date = new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return value;
  }

  return date.toLocaleDateString(
    "en-GB",
    {
      day: "2-digit",
      month: "long",
      year: "numeric",
    }
  );
};

const formatDateTime = (
  value: string
) => {
  const date = new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return value;
  }

  return date.toLocaleString(
    "en-GH",
    {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    }
  );
};

const formatText = (
  value: string
) =>
  value
    .replace(/[_-]+/g, " ")
    .replace(
      /\b\w/g,
      (letter) =>
        letter.toUpperCase()
    );

/* =========================================================
   PAGE
========================================================= */

export default function ReceiptDetailsPage() {
  const router = useRouter();
  const params = useParams();

  const receiptId =
    params?.id as string;

  const [receipt, setReceipt] =
    useState<ReceiptDetails | null>(
      null
    );

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState<string | null>(
      null
    );

  const [downloading, setDownloading] =
    useState(false);

  /* =======================================================
     AUTH
  ======================================================= */

  const handleUnauthorized =
    () => {
      localStorage.removeItem(
        "access_token"
      );

      localStorage.removeItem(
        "user"
      );

      window.location.href =
        "/login";
    };

  /* =======================================================
     FETCH RECEIPT
  ======================================================= */

  useEffect(() => {
    if (!receiptId) return;

    const fetchReceipt =
      async () => {
        try {
          setLoading(true);
          setError(null);

          const token =
            localStorage.getItem(
              "access_token"
            );

          if (!token) {
            handleUnauthorized();
            return;
          }

          const response =
            await fetch(
              `${API_BASE}/admin/receipts/${receiptId}`,
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
            handleUnauthorized();
            return;
          }

          if (
            response.status ===
            404
          ) {
            throw new Error(
              "Receipt not found."
            );
          }

          if (!response.ok) {
            throw new Error(
              "Failed to load receipt."
            );
          }

          const data =
            (await response.json()) as ReceiptDetails;

          setReceipt(data);
        } catch (err) {
          console.error(err);

          setError(
            err instanceof Error
              ? err.message
              : "Failed to load receipt."
          );
        } finally {
          setLoading(false);
        }
      };

    fetchReceipt();
  }, [receiptId]);

  /* =======================================================
     DOWNLOAD
  ======================================================= */

  const downloadReceipt =
    async () => {
      try {
        setDownloading(true);
        setError(null);

        const token =
          localStorage.getItem(
            "access_token"
          );

        if (!token) {
          handleUnauthorized();
          return;
        }

        const response =
          await fetch(
            `${API_BASE}/admin/receipts/${receiptId}/download`,
            {
              headers: {
                Authorization:
                  `Bearer ${token}`,
              },
            }
          );

        if (
          response.status ===
          401
        ) {
          handleUnauthorized();
          return;
        }

        if (!response.ok) {
          throw new Error(
            "Failed to download receipt."
          );
        }

        const blob =
          await response.blob();

        const url =
          URL.createObjectURL(blob);

        const link =
          document.createElement(
            "a"
          );

        link.href = url;

        link.download =
          `${receipt?.receipt_number || "receipt"}.pdf`;

        document.body.appendChild(
          link
        );

        link.click();

        link.remove();

        URL.revokeObjectURL(url);
      } catch (err) {
        console.error(err);

        setError(
          err instanceof Error
            ? err.message
            : "Failed to download receipt."
        );
      } finally {
        setDownloading(false);
      }
    };

  /* =======================================================
     LOADING
  ======================================================= */

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
                  styles.spinner
                }
              />

              <span>
                Loading receipt...
              </span>
            </div>
          </div>
        </main>

        <Footer />
      </>
    );
  }

  /* =======================================================
     ERROR
  ======================================================= */

  if (error || !receipt) {
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
            <section
              className={
                styles.notFound
              }
            >
              <div
                className={
                  styles.notFoundIcon
                }
              >
                <FileText
                  size={27}
                />
              </div>

              <h1>
                Receipt not found
              </h1>

              <p>
                {error ||
                  "The receipt you are looking for could not be found."}
              </p>

              <Link
                href="/admin/receipts"
                className={
                  styles.backMainButton
                }
              >
                <ArrowLeft
                  size={16}
                />
                Back to Receipts
              </Link>
            </section>
          </div>
        </main>

        <Footer />
      </>
    );
  }

  /* =======================================================
     CALCULATED VALUES
  ======================================================= */

  const balance =
    Number(
      receipt.balance_due_ghs
    );

  const isPaid =
    !Number.isNaN(balance) &&
    balance <= 0;

  /* =======================================================
     MAIN
  ======================================================= */

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
                  "/admin/receipts"
                )
              }
              aria-label="Back to receipts"
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
                Finance Management
              </span>

              <h1
                className={
                  styles.heading
                }
              >
                Receipt Details
              </h1>

              <p
                className={
                  styles.subtitle
                }
              >
                Review the full details
                of this transaction.
              </p>
            </div>
          </section>

          {/* =================================================
              RECEIPT HEADER CARD
          ================================================= */}

          <section
            className={
              styles.receiptCard
            }
          >
            <div
              className={
                styles.receiptHeader
              }
            >
              <div
                className={
                  styles.receiptIdentity
                }
              >
                <div
                  className={
                    styles.receiptIcon
                  }
                >
                  <FileText
                    size={24}
                  />
                </div>

                <div>
                  <span
                    className={
                      styles.itemLabel
                    }
                  >
                    Receipt Number
                  </span>

                  <h2>
                    {
                      receipt.receipt_number
                    }
                  </h2>

                  <span
                    className={
                      styles.receiptType
                    }
                  >
                    {formatText(
                      receipt.receipt_type
                    )}
                  </span>
                </div>
              </div>

              <div
                className={
                  styles.headerRight
                }
              >
                <span
                  className={`${styles.status} ${
                    isPaid
                      ? styles.paid
                      : styles.pending
                  }`}
                >
                  <CheckCircle2
                    size={14}
                  />

                  {isPaid
                    ? "Paid"
                    : "Balance Due"}
                </span>

                <strong
                  className={
                    styles.headerAmount
                  }
                >
                  {formatMoney(
                    receipt.amount_ghs
                  )}
                </strong>

                <span
                  className={
                    styles.issued
                  }
                >
                  Issued{" "}
                  {formatDateTime(
                    receipt.issued_at
                  )}
                </span>
              </div>
            </div>

            <div
              className={
                styles.headerActions
              }
            >
              <button
                type="button"
                className={
                  styles.downloadButton
                }
                onClick={
                  downloadReceipt
                }
                disabled={
                  downloading
                }
              >
                <Download
                  size={17}
                />

                {downloading
                  ? "Downloading..."
                  : "Download Receipt"}
              </button>
            </div>
          </section>

          {/* =================================================
              CUSTOMER + PAYMENT
          ================================================= */}

          <div
            className={
              styles.twoColumn
            }
          >

            {/* CUSTOMER */}

            <section
              className={
                styles.infoCard
              }
            >
              <div
                className={
                  styles.sectionHeader
                }
              >
                <div
                  className={
                    styles.sectionIcon
                  }
                >
                  <UserRound
                    size={18}
                  />
                </div>

                <div>
                  <h2>
                    Customer
                  </h2>

                  <p>
                    Customer information
                  </p>
                </div>
              </div>

              <div
                className={
                  styles.customerDetails
                }
              >
                <div>
                  <span>
                    Full Name
                  </span>

                  <strong>
                    {
                      receipt.customer_name ||
                      "—"
                    }
                  </strong>
                </div>

                <div>
                  <span>
                    Email
                  </span>

                  <strong>
                    {
                      receipt.customer_email ||
                      "—"
                    }
                  </strong>
                </div>

                <div>
                  <span>
                    Phone
                  </span>

                  <strong>
                    {
                      receipt.customer_phone ||
                      "—"
                    }
                  </strong>
                </div>
              </div>
            </section>

            {/* PAYMENT */}

            <section
              className={
                styles.infoCard
              }
            >
              <div
                className={
                  styles.sectionHeader
                }
              >
                <div
                  className={
                    styles.sectionIcon
                  }
                >
                  <Wallet
                    size={18}
                  />
                </div>

                <div>
                  <h2>
                    Payment
                  </h2>

                  <p>
                    Transaction information
                  </p>
                </div>
              </div>

              <div
                className={
                  styles.paymentDetails
                }
              >
                <div>
                  <span>
                    Total Price
                  </span>

                  <strong>
                    {formatMoney(
                      receipt.total_price_ghs
                    )}
                  </strong>
                </div>

                <div>
                  <span>
                    Amount Paid
                  </span>

                  <strong
                    className={
                      styles.paidAmount
                    }
                  >
                    {formatMoney(
                      receipt.amount_paid_ghs
                    )}
                  </strong>
                </div>

                <div>
                  <span>
                    Balance Due
                  </span>

                  <strong
                    className={
                      Number(
                        receipt.balance_due_ghs
                      ) > 0
                        ? styles.balanceDue
                        : styles.paidAmount
                    }
                  >
                    {formatMoney(
                      receipt.balance_due_ghs
                    )}
                  </strong>
                </div>

                <div>
                  <span>
                    Payment Reference
                  </span>

                  <strong
                    className={
                      styles.reference
                    }
                  >
                    {
                      receipt.payment_reference ||
                      "—"
                    }
                  </strong>
                </div>
              </div>
            </section>

          </div>

          {/* =================================================
              LINE ITEMS
          ================================================= */}

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
              <div
                className={
                  styles.sectionIcon
                }
              >
                <FileText
                  size={18}
                />
              </div>

              <div>
                <h2>
                  Receipt Items
                </h2>

                <p>
                  Items included in this
                  receipt.
                </p>
              </div>
            </div>

            <div
              className={
                styles.table
              }
            >
              <div
                className={
                  styles.tableHeader
                }
              >
                <span>
                  Description
                </span>

                <span>
                  Qty
                </span>

                <span>
                  Unit Price
                </span>

                <span>
                  Total
                </span>
              </div>

              {receipt.line_items
                .length === 0 ? (
                <div
                  className={
                    styles.noItems
                  }
                >
                  No line items available.
                </div>
              ) : (
                receipt.line_items.map(
                  (
                    item,
                    index
                  ) => (
                    <div
                      key={`${item.description}-${index}`}
                      className={
                        styles.tableRow
                      }
                    >
                      <div
                        className={
                          styles.descriptionCell
                        }
                      >
                        <strong>
                          {
                            item.description
                          }
                        </strong>

                        {item.detail && (
                          <span>
                            {item.detail}
                          </span>
                        )}
                      </div>

                      <span
                        className={
                          styles.quantity
                        }
                      >
                        {
                          item.quantity
                        }
                      </span>

                      <span>
                        {formatMoney(
                          item.unit_price_ghs
                        )}
                      </span>

                      <strong>
                        {formatMoney(
                          item.line_total_ghs
                        )}
                      </strong>
                    </div>
                  )
                )
              )}
            </div>

            {/* TOTAL */}

            <div
              className={
                styles.totalRow
              }
            >
              <span>
                Receipt Total
              </span>

              <strong>
                {formatMoney(
                  receipt.total_price_ghs
                )}
              </strong>
            </div>
          </section>

          {/* =================================================
              FOOTER INFO
          ================================================= */}

          <section
            className={
              styles.footerCard
            }
          >
            <div>
              <span>
                Receipt ID
              </span>

              <strong>
                {receipt.id}
              </strong>
            </div>

            <div>
              <span>
                Issued
              </span>

              <strong>
                {formatDate(
                  receipt.issued_at
                )}
              </strong>
            </div>

            <Link
              href="/admin/receipts"
              className={
                styles.backLink
              }
            >
              <ArrowLeft
                size={15}
              />
              Back to Receipts
            </Link>
          </section>

        </div>
      </main>

      <Footer />
    </>
  );
}