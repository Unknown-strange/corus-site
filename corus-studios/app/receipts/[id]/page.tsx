"use client";

import {
  useEffect,
  useState,
} from "react";

import Link from "next/link";
import { useParams } from "next/navigation";

import {
  ArrowLeft,
  CheckCircle2,
  Clock3,
  Download,
  Loader2,
  Mail,
  Phone,
  Printer,
  ReceiptText,
  User,
} from "lucide-react";

import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

import styles from "./page.module.css";

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:8000";

type ReceiptLineItem = {
  description: string;
  quantity: number;
  unit_price_ghs: string;
  line_total_ghs: string;
  detail?: string;
};

type Receipt = {
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

function formatMoney(
  value: string | number
): string {
  const amount =
    Number(value);

  if (
    !Number.isFinite(
      amount
    )
  ) {
    return "0.00";
  }

  return amount.toLocaleString(
    "en-GH",
    {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }
  );
}

function formatDate(
  value: string
): string {
  const date =
    new Date(value);

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
      dateStyle:
        "long",
      timeStyle:
        "short",
    }
  );
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
    const value =
      data as {
        detail?: unknown;
        message?: unknown;
      };

    if (
      typeof value.detail ===
      "string"
    ) {
      return value.detail;
    }

    if (
      typeof value.message ===
      "string"
    ) {
      return value.message;
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
              message
            ): message is string =>
              Boolean(message)
          );

      if (
        messages.length
      ) {
        return messages.join(
          ", "
        );
      }
    }
  }

  return fallback;
}

export default function ReceiptPage() {
  const params =
    useParams<{
      id: string;
    }>();

  const receiptId =
    params.id;

  const [
    receipt,
    setReceipt,
  ] = useState<Receipt | null>(
    null
  );

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
    if (
      !receiptId
    ) {
      return;
    }

    let cancelled =
      false;

    const loadReceipt =
      async () => {
        const token =
          localStorage.getItem(
            "access_token"
          );

        if (!token) {
          setError(
            "Please log in to view this receipt."
          );

          setLoading(
            false
          );

          return;
        }

        try {
          const response =
            await fetch(
              `${API_BASE}/receipts/${encodeURIComponent(
                receiptId
              )}`,
              {
                method:
                  "GET",

                headers: {
                  Authorization:
                    `Bearer ${token}`,
                },
              }
            );

          const rawBody =
            await response.text();

          let data:
            unknown = null;

          if (
            rawBody
          ) {
            try {
              data =
                JSON.parse(
                  rawBody
                );
            } catch {
              data =
                rawBody;
            }
          }

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

          if (
            !response.ok
          ) {
            throw new Error(
              getErrorMessage(
                data,
                `Unable to load receipt (${response.status}).`
              )
            );
          }

          if (
            cancelled
          ) {
            return;
          }

          setReceipt(
            data as Receipt
          );

          setError(
            null
          );
        } catch (err) {
          if (
            cancelled
          ) {
            return;
          }

          console.error(
            "RECEIPT LOAD FAILED",
            err
          );

          setError(
            err instanceof Error
              ? err.message
              : "Unable to load receipt."
          );
        } finally {
          if (
            !cancelled
          ) {
            setLoading(
              false
            );
          }
        }
      };

    loadReceipt();

    return () => {
      cancelled = true;
    };
  }, [
    receiptId,
  ]);

  /* =========================================================
     PRINT
  ========================================================= */

  const handlePrint =
    () => {
      window.print();
    };

  /* =========================================================
     DOWNLOAD
  ========================================================= */

  const handleDownload =
    async () => {
      if (
        !receiptId
      ) {
        return;
      }

      const token =
        localStorage.getItem(
          "access_token"
        );

      if (!token) {
        return;
      }

      try {
        const response =
          await fetch(
            `${API_BASE}/receipts/${encodeURIComponent(
              receiptId
            )}/download`,
            {
              method:
                "GET",

              headers: {
                Authorization:
                  `Bearer ${token}`,
              },
            }
          );

        if (
          !response.ok
        ) {
          const raw =
            await response.text();

          let data:
            unknown = raw;

          try {
            data =
              JSON.parse(
                raw
              );
          } catch {
            // Keep text.
          }

          throw new Error(
            getErrorMessage(
              data,
              "Unable to download receipt."
            )
          );
        }

        /*
         * The backend documents this endpoint as returning
         * a string. In production that may be a URL.
         */
        const result =
          await response.text();

        let downloadUrl =
          result.trim();

        try {
          const parsed =
            JSON.parse(
              result
            );

          if (
            typeof parsed ===
            "string"
          ) {
            downloadUrl =
              parsed;
          }
        } catch {
          // Plain text URL.
        }

        if (
          /^https?:\/\//i.test(
            downloadUrl
          )
        ) {
          window.open(
            downloadUrl,
            "_blank",
            "noopener,noreferrer"
          );

          return;
        }

        /*
         * If the backend returns document content rather
         * than a URL, download it as a text file.
         */
        const blob =
          new Blob(
            [result],
            {
              type:
                "application/pdf",
            }
          );

        const url =
          URL.createObjectURL(
            blob
          );

        const anchor =
          document.createElement(
            "a"
          );

        anchor.href =
          url;

        anchor.download =
          `${receipt?.receipt_number || "corus-receipt"}.pdf`;

        document.body.appendChild(
          anchor
        );

        anchor.click();

        anchor.remove();

        URL.revokeObjectURL(
          url
        );
      } catch (err) {
        console.error(
          "RECEIPT DOWNLOAD FAILED",
          err
        );

        setError(
          err instanceof Error
            ? err.message
            : "Unable to download receipt."
        );
      }
    };

  /* =========================================================
     LOADING
  ========================================================= */

  if (
    loading
  ) {
    return (
      <>
        <Navbar />

        <main
          className={
            styles.page
          }
        >
          <div
            className={
              styles.stateCard
            }
          >
            <div
              className={
                styles.stateIcon
              }
            >
              <Loader2
                size={32}
              />
            </div>

            <h1>
              Loading Receipt
            </h1>

            <p>
              Retrieving your receipt...
            </p>
          </div>
        </main>

        <Footer />
      </>
    );
  }

  /* =========================================================
     ERROR
  ========================================================= */

  if (
    error ||
    !receipt
  ) {
    return (
      <>
        <Navbar />

        <main
          className={
            styles.page
          }
        >
          <div
            className={`${styles.stateCard} ${styles.errorCard}`}
          >
            <div
              className={
                styles.errorIcon
              }
            >
              !
            </div>

            <h1>
              Receipt Unavailable
            </h1>

            <p>
              {error ||
                "This receipt could not be found."}
            </p>

            <Link
              href="/checkout"
              className={
                styles.primaryButton
              }
            >
              Return to Checkout
            </Link>
          </div>
        </main>

        <Footer />
      </>
    );
  }

  /* =========================================================
     RECEIPT
  ========================================================= */

  return (
    <>
      <Navbar />

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
              styles.topBar
            }
          >
            <Link
              href="/"
              className={
                styles.backLink
              }
            >
              <ArrowLeft
                size={16}
              />

              Back
            </Link>

            <div
              className={
                styles.actions
              }
            >
              <button
                type="button"
                className={
                  styles.secondaryButton
                }
                onClick={
                  handleDownload
                }
              >
                <Download
                  size={15}
                />

                Download
              </button>

              <button
                type="button"
                className={
                  styles.primaryButton
                }
                onClick={
                  handlePrint
                }
              >
                <Printer
                  size={15}
                />

                Print
              </button>
            </div>
          </div>

          <article
            className={
              styles.receiptCard
            }
          >
            <header
              className={
                styles.receiptHeader
              }
            >
              <div>
                <span
                  className={
                    styles.eyebrow
                  }
                >
                  Corus Studios
                </span>

                <h1>
                  Payment Receipt
                </h1>

                <p>
                  Official record of
                  your payment.
                </p>
              </div>

              <div
                className={
                  styles.successBadge
                }
              >
                <CheckCircle2
                  size={16}
                />

                Paid
              </div>
            </header>

            <div
              className={
                styles.receiptMeta
              }
            >
              <div>
                <span>
                  Receipt Number
                </span>

                <strong>
                  {
                    receipt.receipt_number
                  }
                </strong>
              </div>

              <div>
                <span>
                  Receipt Type
                </span>

                <strong>
                  {
                    receipt.receipt_type
                  }
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

              <div>
                <span>
                  Payment Reference
                </span>

                <strong>
                  {
                    receipt.payment_reference
                  }
                </strong>
              </div>
            </div>

            <section
              className={
                styles.customer
              }
            >
              <h2>
                Customer
              </h2>

              <div
                className={
                  styles.customerGrid
                }
              >
                <div>
                  <User
                    size={15}
                  />

                  <span>
                    {
                      receipt.customer_name
                    }
                  </span>
                </div>

                <div>
                  <Mail
                    size={15}
                  />

                  <span>
                    {
                      receipt.customer_email
                    }
                  </span>
                </div>

                <div>
                  <Phone
                    size={15}
                  />

                  <span>
                    {
                      receipt.customer_phone
                    }
                  </span>
                </div>
              </div>
            </section>

            <section
              className={
                styles.itemsSection
              }
            >
              <div
                className={
                  styles.sectionTitle
                }
              >
                <ReceiptText
                  size={17}
                />

                <h2>
                  Items
                </h2>
              </div>

              <div
                className={
                  styles.items
                }
              >
                {receipt.line_items.map(
                  (
                    item,
                    index
                  ) => (
                    <div
                      key={`${item.description}-${index}`}
                      className={
                        styles.item
                      }
                    >
                      <div
                        className={
                          styles.itemMain
                        }
                      >
                        <strong>
                          {
                            item.description
                          }
                        </strong>

                        {item.detail && (
                          <span>
                            {
                              item.detail
                            }
                          </span>
                        )}
                      </div>

                      <div
                        className={
                          styles.itemQty
                        }
                      >
                        ×
                        {
                          item.quantity
                        }
                      </div>

                      <div
                        className={
                          styles.itemPrice
                        }
                      >
                        GH₵
                        {formatMoney(
                          item.line_total_ghs
                        )}
                      </div>
                    </div>
                  )
                )}
              </div>
            </section>

            <section
              className={
                styles.totals
              }
            >
              <div
                className={
                  styles.totalRow
                }
              >
                <span>
                  Total Price
                </span>

                <strong>
                  GH₵
                  {formatMoney(
                    receipt.total_price_ghs
                  )}
                </strong>
              </div>

              <div
                className={
                  styles.totalRow
                }
              >
                <span>
                  Amount Paid
                </span>

                <strong>
                  GH₵
                  {formatMoney(
                    receipt.amount_paid_ghs
                  )}
                </strong>
              </div>

              <div
                className={
                  styles.totalRow
                }
              >
                <span>
                  Balance Due
                </span>

                <strong
                  className={
                    styles.balance
                  }
                >
                  GH₵
                  {formatMoney(
                    receipt.balance_due_ghs
                  )}
                </strong>
              </div>

              <div
                className={`${styles.totalRow} ${styles.grandTotal}`}
              >
                <span>
                  Receipt Amount
                </span>

                <strong>
                  GH₵
                  {formatMoney(
                    receipt.amount_ghs
                  )}
                </strong>
              </div>
            </section>

            <footer
              className={
                styles.receiptFooter
              }
            >
              <Clock3
                size={14}
              />

              <span>
                Issued on{" "}
                {formatDate(
                  receipt.issued_at
                )}
              </span>
            </footer>
          </article>
        </div>
      </main>

      <Footer />
    </>
  );
}