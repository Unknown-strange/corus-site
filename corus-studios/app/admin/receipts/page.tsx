"use client";

import {
  useEffect,
  useState,
} from "react";

import Link from "next/link";

import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  FileText,
  ReceiptText,
  Search,
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

type Receipt = {
  id: string;
  receipt_number: string;
  receipt_type: string;
  amount_ghs: string;
  issued_at: string;
};

type ReceiptsResponse = {
  items: Receipt[];
  total: number;
  page: number;
  limit: number;
  pages: number;
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
      month: "short",
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
    .replace(
      /[_-]+/g,
      " "
    )
    .replace(
      /\b\w/g,
      (letter) =>
        letter.toUpperCase()
    );


/* =========================================================
   PAGE
========================================================= */

export default function ReceiptsPage() {

  const [
    receipts,
    setReceipts,
  ] = useState<Receipt[]>([]);


  const [
    loading,
    setLoading,
  ] = useState(true);


  const [
    error,
    setError,
  ] = useState<
    string | null
  >(null);


  const [
    page,
    setPage,
  ] = useState(1);


  const [
    pages,
    setPages,
  ] = useState(1);


  const [
    total,
    setTotal,
  ] = useState(0);


  const [
    search,
    setSearch,
  ] = useState("");


  const [
    receiptType,
    setReceiptType,
  ] = useState("");


  const [
    fromDate,
    setFromDate,
  ] = useState("");


  const [
    toDate,
    setToDate,
  ] = useState("");


  const limit = 10;


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
     FETCH
  ======================================================= */

  useEffect(() => {

    const fetchReceipts =
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


          if (
            receiptType
          ) {
            params.set(
              "receipt_type",
              receiptType
            );
          }


          if (
            fromDate
          ) {
            params.set(
              "from_date",
              `${fromDate}T00:00:00.000Z`
            );
          }


          if (
            toDate
          ) {
            params.set(
              "to_date",
              `${toDate}T23:59:59.000Z`
            );
          }


          const response =
            await fetch(
              `${API_BASE}/admin/receipts?${params.toString()}`,
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
            !response.ok
          ) {

            throw new Error(
              "Failed to load receipts."
            );
          }


          const data =
            (await response.json()) as ReceiptsResponse;


          setReceipts(
            Array.isArray(
              data.items
            )
              ? data.items
              : []
          );


          setTotal(
            Number(
              data.total
            ) || 0
          );


          setPages(
            Number(
              data.pages
            ) || 1
          );

        } catch (err) {

          console.error(err);

          setError(
            err instanceof Error
              ? err.message
              : "Failed to load receipts."
          );

        } finally {

          setLoading(false);

        }
      };


    fetchReceipts();

  }, [
    page,
    receiptType,
    fromDate,
    toDate,
  ]);


  /* =======================================================
     SEARCH
  ======================================================= */

  const filteredReceipts =
    receipts.filter(
      (receipt) => {

        if (
          !search.trim()
        ) {
          return true;
        }

        const query =
          search
            .trim()
            .toLowerCase();


        return (
          receipt.receipt_number
            .toLowerCase()
            .includes(query) ||

          receipt.receipt_type
            .toLowerCase()
            .includes(query)
        );
      }
    );


  /* =======================================================
     RENDER
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
              styles.hero
            }
          >

            <Link
              href="/admin/Finance"
              className={
                styles.backButton
              }
              aria-label="Back to Finance"
            >
              <ArrowLeft
                size={18}
              />
            </Link>


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
                Finance Management
              </span>


              <h1
                className={
                  styles.heading
                }
              >
                Receipts
              </h1>


              <p
                className={
                  styles.subtitle
                }
              >
                View and manage receipts
                issued by Corus Studio.
              </p>

            </div>


            <div
              className={
                styles.totalBox
              }
            >

              <div
                className={
                  styles.totalIcon
                }
              >
                <ReceiptText
                  size={20}
                />
              </div>


              <div>

                <strong>
                  {total}
                </strong>

                <span>
                  Total receipts
                </span>

              </div>

            </div>

          </section>


          {/* =================================================
              FILTERS
          ================================================= */}

          <section
            className={
              styles.filterCard
            }
          >

            <div
              className={
                styles.searchBox
              }
            >

              <Search
                size={17}
              />

              <input
                type="search"
                placeholder="Search receipt number or type..."
                value={search}
                onChange={(
                  event
                ) =>
                  setSearch(
                    event.target
                      .value
                  )
                }
              />

            </div>


            <select
              className={
                styles.select
              }
              value={
                receiptType
              }
              onChange={(
                event
              ) => {
                setPage(1);

                setReceiptType(
                  event.target
                    .value
                );
              }}
            >
              <option value="">
                All receipt types
              </option>

              <option value="payment">
                Payment
              </option>

              <option value="booking">
                Booking
              </option>

              <option value="rental">
                Rental
              </option>

              <option value="order">
                Order
              </option>
            </select>


            <input
              type="date"
              className={
                styles.dateInput
              }
              value={
                fromDate
              }
              onChange={(
                event
              ) => {
                setPage(1);

                setFromDate(
                  event.target
                    .value
                );
              }}
            />


            <input
              type="date"
              className={
                styles.dateInput
              }
              value={
                toDate
              }
              onChange={(
                event
              ) => {
                setPage(1);

                setToDate(
                  event.target
                    .value
                );
              }}
            />


            <button
              type="button"
              className={
                styles.clearButton
              }
              onClick={() => {

                setPage(1);

                setSearch("");

                setReceiptType("");

                setFromDate("");

                setToDate("");

              }}
            >
              Clear
            </button>

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
              {error}
            </div>

          )}


          {/* =================================================
              RECEIPTS CARD
          ================================================= */}

          <section
            className={
              styles.receiptsCard
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
                    All Receipts
                  </h2>

                  <span
                    className={
                      styles.countBadge
                    }
                  >
                    {filteredReceipts.length}
                  </span>

                </div>

                <p>
                  Receipts issued for
                  completed transactions.
                </p>

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
                  length: 6,
                }).map(
                  (
                    _,
                    index
                  ) => (

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

            ) : filteredReceipts.length ===
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
                  <FileText
                    size={28}
                  />
                </div>


                <h3>
                  No receipts found
                </h3>


                <p>
                  There are no receipts
                  matching your current
                  filters.
                </p>

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

                {filteredReceipts.map(
                  (
                    receipt
                  ) => (

                    <Link
                      key={
                        receipt.id
                      }

                      href={`/admin/receipts/${receipt.id}`}

                      className={
                        styles.item
                      }
                    >

                      {/* ICON */}

                      <div
                        className={
                          styles.receiptIcon
                        }
                      >
                        <FileText
                          size={19}
                        />
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
                          Receipt
                        </span>


                        <h3
                          className={
                            styles.receiptNumber
                          }
                        >
                          {
                            receipt.receipt_number
                          }
                        </h3>


                        <span
                          className={
                            styles.receiptType
                          }
                        >
                          {
                            formatText(
                              receipt.receipt_type
                            )
                          }
                        </span>

                      </div>


                      {/* AMOUNT */}

                      <div
                        className={
                          styles.amountBox
                        }
                      >

                        <span>
                          Amount
                        </span>

                        <strong>
                          {formatMoney(
                            receipt.amount_ghs
                          )}
                        </strong>

                      </div>


                      {/* DATE */}

                      <div
                        className={
                          styles.dateBox
                        }
                      >

                        <span>
                          Issued
                        </span>

                        <strong>
                          {formatDate(
                            receipt.issued_at
                          )}
                        </strong>

                        <small>
                          {formatDateTime(
                            receipt.issued_at
                          ).split(
                            ", "
                          )[1] || ""}
                        </small>

                      </div>


                      {/* ARROW */}

                      <div
                        className={
                          styles.arrow
                        }
                      >
                        <ChevronRight
                          size={20}
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

                    className={
                      styles.pageButton
                    }

                    disabled={
                      page <= 1
                    }

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

                    className={
                      styles.pageButton
                    }

                    disabled={
                      page >=
                      pages
                    }

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