"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CircleDollarSign,
  Download,
  Edit3,
  FileDown,
  Filter,
  FileText,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  Wallet,
  X,
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

type FinanceRecord = {
  id: string;
  record_type: string;
  source: string;
  amount_ghs: string;
  record_date: string;
  category: string;
  description: string;
  source_label: string;
  payment_id: string | null;
  created_by_id: string | null;
  updated_by_id: string | null;
  created_at: string;
  updated_at: string;
};

type FinanceResponse = {
  items: FinanceRecord[];
  total: number;
  page: number;
  limit: number;
  pages: number;
};

type FinanceSummary = {
  total_income_ghs: string;
  total_expenses_ghs: string;
  profit_ghs: string;
  record_count: number;
  period_start: string;
  period_end: string;
};

type FinanceAlert = {
  alert_type: string;
  message: string;
  threshold_ghs: string;
  actual_ghs: string;
};

type FinanceAlertsResponse = {
  alerts: FinanceAlert[];
  period_start: string;
  period_end: string;
};

type Payment = {
  id: string;
  user_id: string;
  customer_email: string;
  customer_name: string;
  reference: string;
  amount_ghs: string;
  currency: string;
  status: string;
  purpose: string;
  receipt_id: string | null;
  receipt_number: string | null;
  created_at: string;
};

type PaymentsResponse = {
  items: Payment[];
  total: number;
  page: number;
  limit: number;
  pages: number;
};

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

type RecordForm = {
  record_type: string;
  amount_ghs: string;
  record_date: string;
  category: string;
  description: string;
  source_label: string;
};

const emptyForm: RecordForm = {
  record_type: "income",
  amount_ghs: "",
  record_date: "",
  category: "",
  description: "",
  source_label: "",
};

/* =========================================================
   HELPERS
========================================================= */

const formatMoney = (value: string | number) => {
  const amount = Number(value);

  if (Number.isNaN(amount)) {
    return `GH₵${String(value)}`;
  }

  return `GH₵${amount.toLocaleString("en-GH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

const formatDate = (value: string) => {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const formatText = (value: string) =>
  value
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (letter) =>
      letter.toUpperCase()
    );

const buildDateTime = (
  value: string,
  endOfDay = false
) => {
  if (!value) return "";

  return endOfDay
    ? `${value}T23:59:59.000Z`
    : `${value}T00:00:00.000Z`;
};

/* =========================================================
   PAGE
========================================================= */

export default function FinancePage() {
  const [summary, setSummary] =
    useState<FinanceSummary | null>(null);

  const [records, setRecords] =
    useState<FinanceRecord[]>([]);

  const [payments, setPayments] =
    useState<Payment[]>([]);

  const [receipts, setReceipts] =
    useState<Receipt[]>([]);

  const [alerts, setAlerts] =
    useState<FinanceAlert[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [recordsLoading, setRecordsLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [error, setError] =
    useState<string | null>(null);

  const [page, setPage] =
    useState(1);

  const [pages, setPages] =
    useState(1);

  const [totalRecords, setTotalRecords] =
    useState(0);

  const [fromDate, setFromDate] =
    useState("");

  const [toDate, setToDate] =
    useState("");

  const [recordType, setRecordType] =
    useState("");

  const [category, setCategory] =
    useState("");

  const [search, setSearch] =
    useState("");

  const limit = 10;

  const [showModal, setShowModal] =
    useState(false);

  const [editingRecord, setEditingRecord] =
    useState<FinanceRecord | null>(null);

  const [form, setForm] =
    useState<RecordForm>(emptyForm);

  const [saving, setSaving] =
    useState(false);

  const [deletingId, setDeletingId] =
    useState<string | null>(null);

  const [exporting, setExporting] =
    useState<"csv" | "pdf" | null>(null);

  /* =======================================================
     AUTH
  ======================================================= */

  const getToken = () =>
    localStorage.getItem("access_token");

  const handleUnauthorized = () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("user");
    window.location.href = "/login";
  };

  /* =======================================================
     QUERY
  ======================================================= */

  const createQueryParams = (
    includePagination = true
  ) => {
    const params = new URLSearchParams();

    if (includePagination) {
      params.set("page", page.toString());
      params.set("limit", limit.toString());
    }

    if (recordType) {
      params.set(
        "record_type",
        recordType
      );
    }

    if (category) {
      params.set("category", category);
    }

    if (search.trim()) {
      params.set(
        "search",
        search.trim()
      );
    }

    if (fromDate) {
      params.set(
        "from_date",
        buildDateTime(fromDate)
      );
    }

    if (toDate) {
      params.set(
        "to_date",
        buildDateTime(
          toDate,
          true
        )
      );
    }

    return params;
  };

  /* =======================================================
     LOAD EVERYTHING
  ======================================================= */

  const fetchFinanceData = async (
    showRefresh = false
  ) => {
    try {
      if (showRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setRecordsLoading(true);
      setError(null);

      const authToken = getToken();

      if (!authToken) {
        handleUnauthorized();
        return;
      }

      const summaryParams =
        new URLSearchParams();

      if (fromDate) {
        summaryParams.set(
          "from_date",
          buildDateTime(fromDate)
        );
      }

      if (toDate) {
        summaryParams.set(
          "to_date",
          buildDateTime(
            toDate,
            true
          )
        );
      }

      const recordParams =
        createQueryParams(true);

      const paymentParams =
        new URLSearchParams();

      paymentParams.set("page", "1");
      paymentParams.set("limit", "5");

      if (fromDate) {
        paymentParams.set(
          "from_date",
          buildDateTime(fromDate)
        );
      }

      if (toDate) {
        paymentParams.set(
          "to_date",
          buildDateTime(
            toDate,
            true
          )
        );
      }

      const receiptParams =
        new URLSearchParams();

      receiptParams.set("page", "1");
      receiptParams.set("limit", "5");

      if (fromDate) {
        receiptParams.set(
          "from_date",
          buildDateTime(fromDate)
        );
      }

      if (toDate) {
        receiptParams.set(
          "to_date",
          buildDateTime(
            toDate,
            true
          )
        );
      }

      const headers = {
        Authorization:
          `Bearer ${authToken}`,
        Accept:
          "application/json",
      };

      const [
        summaryResponse,
        recordsResponse,
        alertsResponse,
        paymentsResponse,
        receiptsResponse,
      ] = await Promise.all([
        fetch(
          `${API_BASE}/admin/finance/summary?${summaryParams.toString()}`,
          { headers }
        ),

        fetch(
          `${API_BASE}/admin/finance/records?${recordParams.toString()}`,
          { headers }
        ),

        fetch(
          `${API_BASE}/admin/finance/alerts`,
          { headers }
        ),

        fetch(
          `${API_BASE}/admin/payments?${paymentParams.toString()}`,
          { headers }
        ),

        fetch(
          `${API_BASE}/admin/receipts?${receiptParams.toString()}`,
          { headers }
        ),
      ]);

      const responses = [
        summaryResponse,
        recordsResponse,
        alertsResponse,
        paymentsResponse,
        receiptsResponse,
      ];

      if (
        responses.some(
          (response) =>
            response.status === 401
        )
      ) {
        handleUnauthorized();
        return;
      }

      if (!summaryResponse.ok) {
        throw new Error(
          "Failed to load finance summary."
        );
      }

      if (!recordsResponse.ok) {
        throw new Error(
          "Failed to load finance records."
        );
      }

      const summaryData: FinanceSummary =
        await summaryResponse.json();

      const recordsData: FinanceResponse =
        await recordsResponse.json();

      const alertsData: FinanceAlertsResponse =
        alertsResponse.ok
          ? await alertsResponse.json()
          : {
              alerts: [],
              period_start: "",
              period_end: "",
            };

      const paymentsData: PaymentsResponse =
        paymentsResponse.ok
          ? await paymentsResponse.json()
          : {
              items: [],
              total: 0,
              page: 1,
              limit: 5,
              pages: 1,
            };

      const receiptsData: ReceiptsResponse =
        receiptsResponse.ok
          ? await receiptsResponse.json()
          : {
              items: [],
              total: 0,
              page: 1,
              limit: 5,
              pages: 1,
            };

      setSummary(summaryData);

      setRecords(
        Array.isArray(
          recordsData.items
        )
          ? recordsData.items
          : []
      );

      setPages(
        Number(recordsData.pages) || 1
      );

      setTotalRecords(
        Number(recordsData.total) || 0
      );

      setAlerts(
        Array.isArray(
          alertsData.alerts
        )
          ? alertsData.alerts
          : []
      );

      setPayments(
        Array.isArray(
          paymentsData.items
        )
          ? paymentsData.items
          : []
      );

      setReceipts(
        Array.isArray(
          receiptsData.items
        )
          ? receiptsData.items
          : []
      );
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : "Failed to load finance data."
      );
    } finally {
      setLoading(false);
      setRecordsLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchFinanceData();
  }, [
    page,
    fromDate,
    toDate,
    recordType,
    category,
    search,
  ]);

  /* =======================================================
     RECORD MODAL
  ======================================================= */

  const openAddModal = () => {
    setEditingRecord(null);

    setForm({
      ...emptyForm,
      record_date:
        new Date()
          .toISOString()
          .slice(0, 10),
    });

    setShowModal(true);
  };

  const openEditModal = (
    record: FinanceRecord
  ) => {
    setEditingRecord(record);

    setForm({
      record_type:
        record.record_type ||
        "income",

      amount_ghs:
        record.amount_ghs || "",

      record_date:
        record.record_date
          ? new Date(
              record.record_date
            )
              .toISOString()
              .slice(0, 10)
          : "",

      category:
        record.category || "",

      description:
        record.description || "",

      source_label:
        record.source_label || "",
    });

    setShowModal(true);
  };

  const closeModal = () => {
    if (saving) return;

    setShowModal(false);
    setEditingRecord(null);
    setForm(emptyForm);
  };

  const handleFormChange = (
    key: keyof RecordForm,
    value: string
  ) => {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));
  };

  /* =======================================================
     SAVE RECORD
  ======================================================= */

  const saveRecord = async () => {
    try {
      setSaving(true);
      setError(null);

      const authToken = getToken();

      if (!authToken) {
        handleUnauthorized();
        return;
      }

      const payload = {
        record_type:
          form.record_type,

        amount_ghs:
          Number(form.amount_ghs),

        record_date:
          buildDateTime(
            form.record_date
          ),

        category:
          form.category,

        description:
          form.description,

        source_label:
          form.source_label,
      };

      const url =
        editingRecord
          ? `${API_BASE}/admin/finance/records/${editingRecord.id}`
          : `${API_BASE}/admin/finance/records`;

      const response =
        await fetch(url, {
          method:
            editingRecord
              ? "PATCH"
              : "POST",

          headers: {
            Authorization:
              `Bearer ${authToken}`,

            "Content-Type":
              "application/json",
          },

          body: JSON.stringify(
            payload
          ),
        });

      if (response.status === 401) {
        handleUnauthorized();
        return;
      }

      if (!response.ok) {
        const body =
          await response
            .json()
            .catch(() => null);

        throw new Error(
          typeof body?.detail ===
            "string"
            ? body.detail
            : "Failed to save finance record."
        );
      }

      closeModal();

      await fetchFinanceData(true);
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : "Failed to save finance record."
      );
    } finally {
      setSaving(false);
    }
  };

  /* =======================================================
     DELETE
  ======================================================= */

  const deleteRecord = async (
    id: string
  ) => {
    if (
      !window.confirm(
        "Are you sure you want to delete this finance record?"
      )
    ) {
      return;
    }

    try {
      setDeletingId(id);
      setError(null);

      const authToken = getToken();

      if (!authToken) {
        handleUnauthorized();
        return;
      }

      const response =
        await fetch(
          `${API_BASE}/admin/finance/records/${id}`,
          {
            method: "DELETE",
            headers: {
              Authorization:
                `Bearer ${authToken}`,
            },
          }
        );

      if (response.status === 401) {
        handleUnauthorized();
        return;
      }

      if (!response.ok) {
        throw new Error(
          "Failed to delete finance record."
        );
      }

      await fetchFinanceData(true);
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : "Failed to delete finance record."
      );
    } finally {
      setDeletingId(null);
    }
  };

  /* =======================================================
     EXPORT
  ======================================================= */

  const exportFinance = async (
    type: "csv" | "pdf"
  ) => {
    try {
      setExporting(type);

      const authToken = getToken();

      if (!authToken) {
        handleUnauthorized();
        return;
      }

      const params =
        createQueryParams(false);

      const endpoint =
        type === "csv"
          ? "/admin/finance/export.csv"
          : "/admin/finance/export.pdf";

      const response =
        await fetch(
          `${API_BASE}${endpoint}${
            params.toString()
              ? `?${params.toString()}`
              : ""
          }`,
          {
            headers: {
              Authorization:
                `Bearer ${authToken}`,
            },
          }
        );

      if (response.status === 401) {
        handleUnauthorized();
        return;
      }

      if (!response.ok) {
        throw new Error(
          `Failed to export ${type.toUpperCase()}.`
        );
      }

      const blob =
        await response.blob();

      const url =
        URL.createObjectURL(blob);

      const anchor =
        document.createElement("a");

      anchor.href = url;

      anchor.download =
        type === "csv"
          ? "corus-finance.csv"
          : "corus-finance.pdf";

      document.body.appendChild(
        anchor
      );

      anchor.click();

      anchor.remove();

      URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : "Export failed."
      );
    } finally {
      setExporting(null);
    }
  };

  /* =======================================================
     FILTER OPTIONS
  ======================================================= */

  const uniqueCategories =
    useMemo(() => {
      return Array.from(
        new Set(
          records
            .map(
              (record) =>
                record.category?.trim()
            )
            .filter(Boolean)
        )
      );
    }, [records]);

  const uniqueRecordTypes =
    useMemo(() => {
      return Array.from(
        new Set(
          records
            .map(
              (record) =>
                record.record_type?.trim()
            )
            .filter(Boolean)
        )
      );
    }, [records]);

  /* =======================================================
     RENDER
  ======================================================= */

  return (
    <>
      <NavbarAdmin />

      <main className={styles.page}>
        <div className={styles.container}>

          {/* HERO */}

          <section className={styles.hero}>
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
                Finance
              </h1>

              <p
                className={
                  styles.subtitle
                }
              >
                Track income, expenses,
                profit and financial
                activity for Corus Studio.
              </p>
            </div>

            <div
              className={
                styles.heroActions
              }
            >
              <button
                type="button"
                className={
                  styles.primaryButton
                }
                onClick={
                  openAddModal
                }
              >
                <Plus size={17} />
                Add Record
              </button>

              <button
                type="button"
                className={
                  styles.secondaryButton
                }
                onClick={() =>
                  fetchFinanceData(
                    true
                  )
                }
                disabled={
                  refreshing
                }
              >
                <RefreshCw
                  size={16}
                  className={
                    refreshing
                      ? styles.spinning
                      : ""
                  }
                />
                Refresh
              </button>
            </div>
          </section>

          {/* ERROR */}

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
                  fetchFinanceData()
                }
              >
                Retry
              </button>
            </div>
          )}

          {/* SUMMARY */}

          <section
            className={
              styles.summaryGrid
            }
          >
            <SummaryCard
              icon={
                <ArrowUpRight
                  size={21}
                />
              }
              label="Total Income"
              value={
                loading || !summary
                  ? "—"
                  : formatMoney(
                      summary.total_income_ghs
                    )
              }
              className={
                styles.incomeIcon
              }
            />

            <SummaryCard
              icon={
                <ArrowDownRight
                  size={21}
                />
              }
              label="Total Expenses"
              value={
                loading || !summary
                  ? "—"
                  : formatMoney(
                      summary.total_expenses_ghs
                    )
              }
              className={
                styles.expenseIcon
              }
            />

            <SummaryCard
              icon={
                <Wallet size={21} />
              }
              label="Profit"
              value={
                loading || !summary
                  ? "—"
                  : formatMoney(
                      summary.profit_ghs
                    )
              }
              className={
                styles.profitIcon
              }
            />

            <SummaryCard
              icon={
                <CircleDollarSign
                  size={21}
                />
              }
              label="Records"
              value={
                loading || !summary
                  ? "—"
                  : summary.record_count.toString()
              }
              className={
                styles.recordsIcon
              }
            />
          </section>

          {/* ALERTS */}

          {alerts.length > 0 && (
            <section
              className={
                styles.alertPanel
              }
            >
              <div
                className={
                  styles.alertHeader
                }
              >
                <div
                  className={
                    styles.alertIcon
                  }
                >
                  <AlertTriangle
                    size={18}
                  />
                </div>

                <div>
                  <h2>
                    Finance Alerts
                  </h2>

                  <p>
                    Some financial
                    thresholds need
                    attention.
                  </p>
                </div>
              </div>

              <div
                className={
                  styles.alertList
                }
              >
                {alerts.map(
                  (
                    alert,
                    index
                  ) => (
                    <div
                      key={`${alert.alert_type}-${index}`}
                      className={
                        styles.alertItem
                      }
                    >
                      <strong>
                        {formatText(
                          alert.alert_type
                        )}
                      </strong>

                      <span>
                        {alert.message}
                      </span>
                    </div>
                  )
                )}
              </div>
            </section>
          )}

          {/* FINANCE RECORDS */}

          <section
            className={
              styles.recordsCard
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
                    Finance Records
                  </h2>

                  <span
                    className={
                      styles.countBadge
                    }
                  >
                    {totalRecords} total
                  </span>
                </div>

                <p>
                  Review and manage
                  income and expense
                  records.
                </p>
              </div>

              <div
                className={
                  styles.exportActions
                }
              >
                <button
                  type="button"
                  className={
                    styles.exportButton
                  }
                  onClick={() =>
                    exportFinance(
                      "csv"
                    )
                  }
                  disabled={
                    exporting !==
                    null
                  }
                >
                  <Download
                    size={15}
                  />

                  {exporting ===
                  "csv"
                    ? "Exporting..."
                    : "CSV"}
                </button>

                <button
                  type="button"
                  className={
                    styles.exportButton
                  }
                  onClick={() =>
                    exportFinance(
                      "pdf"
                    )
                  }
                  disabled={
                    exporting !==
                    null
                  }
                >
                  <FileDown
                    size={15}
                  />

                  {exporting ===
                  "pdf"
                    ? "Exporting..."
                    : "PDF"}
                </button>
              </div>
            </div>

            <div
              className={
                styles.filters
              }
            >
              <div
                className={
                  styles.searchWrapper
                }
              >
                <Search
                  size={16}
                />

                <input
                  type="search"
                  value={search}
                  onChange={(
                    event
                  ) => {
                    setPage(1);
                    setSearch(
                      event.target
                        .value
                    );
                  }}
                  placeholder="Search records..."
                />
              </div>

              <select
                className={
                  styles.select
                }
                value={recordType}
                onChange={(
                  event
                ) => {
                  setPage(1);
                  setRecordType(
                    event.target
                      .value
                  );
                }}
              >
                <option value="">
                  All types
                </option>

                {uniqueRecordTypes.map(
                  (type) => (
                    <option
                      key={type}
                      value={type}
                    >
                      {formatText(
                        type
                      )}
                    </option>
                  )
                )}

                {!uniqueRecordTypes.includes(
                  "income"
                ) && (
                  <option value="income">
                    Income
                  </option>
                )}

                {!uniqueRecordTypes.includes(
                  "expense"
                ) && (
                  <option value="expense">
                    Expense
                  </option>
                )}
              </select>

              <select
                className={
                  styles.select
                }
                value={category}
                onChange={(
                  event
                ) => {
                  setPage(1);
                  setCategory(
                    event.target
                      .value
                  );
                }}
              >
                <option value="">
                  All categories
                </option>

                {uniqueCategories.map(
                  (item) => (
                    <option
                      key={item}
                      value={item}
                    >
                      {item}
                    </option>
                  )
                )}
              </select>

              <input
                type="date"
                className={
                  styles.dateInput
                }
                value={fromDate}
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
                value={toDate}
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
                  styles.clearFilters
                }
                onClick={() => {
                  setPage(1);
                  setSearch("");
                  setRecordType("");
                  setCategory("");
                  setFromDate("");
                  setToDate("");
                }}
              >
                <Filter
                  size={15}
                />
                Clear
              </button>
            </div>

            {recordsLoading ? (
              <div
                className={
                  styles.loadingList
                }
              >
                {Array.from({
                  length: 5,
                }).map((_, index) => (
                  <div
                    key={index}
                    className={
                      styles.skeleton
                    }
                  />
                ))}
              </div>
            ) : records.length ===
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
                  <CircleDollarSign
                    size={27}
                  />
                </div>

                <h3>
                  No finance records
                </h3>

                <p>
                  No records match your
                  current filters.
                </p>

                <button
                  type="button"
                  className={
                    styles.emptyButton
                  }
                  onClick={
                    openAddModal
                  }
                >
                  <Plus
                    size={16}
                  />
                  Add Record
                </button>
              </div>
            ) : (
              <div
                className={
                  styles.recordList
                }
              >
                {records.map(
                  (record) => {
                    const isExpense =
                      record.record_type
                        .toLowerCase()
                        .includes(
                          "expense"
                        );

                    return (
                      <article
                        key={
                          record.id
                        }
                        className={
                          styles.recordItem
                        }
                      >
                        <div
                          className={`${styles.recordIcon} ${
                            isExpense
                              ? styles.recordIconExpense
                              : styles.recordIconIncome
                          }`}
                        >
                          {isExpense ? (
                            <ArrowDownRight
                              size={
                                18
                              }
                            />
                          ) : (
                            <ArrowUpRight
                              size={
                                18
                              }
                            />
                          )}
                        </div>

                        <div
                          className={
                            styles.recordMain
                          }
                        >
                          <div
                            className={
                              styles.recordTop
                            }
                          >
                            <div>
                              <span
                                className={
                                  styles.recordType
                                }
                              >
                                {formatText(
                                  record.record_type
                                )}
                              </span>

                              <h3>
                                {record.description ||
                                  record.source_label ||
                                  record.category ||
                                  "Finance record"}
                              </h3>
                            </div>

                            <strong
                              className={`${styles.amount} ${
                                isExpense
                                  ? styles.amountExpense
                                  : styles.amountIncome
                              }`}
                            >
                              {isExpense
                                ? "-"
                                : "+"}

                              {formatMoney(
                                record.amount_ghs
                              )}
                            </strong>
                          </div>

                          <div
                            className={
                              styles.recordMeta
                            }
                          >
                            <span>
                              {record.category ||
                                "Uncategorized"}
                            </span>

                            <span>
                              {record.source_label ||
                                record.source ||
                                "Manual"}
                            </span>

                            <span>
                              {formatDate(
                                record.record_date
                              )}
                            </span>
                          </div>
                        </div>

                        <div
                          className={
                            styles.recordActions
                          }
                        >
                          <button
                            type="button"
                            className={
                              styles.iconButton
                            }
                            onClick={() =>
                              openEditModal(
                                record
                              )
                            }
                          >
                            <Edit3
                              size={16}
                            />
                          </button>

                          <button
                            type="button"
                            className={`${styles.iconButton} ${styles.deleteIconButton}`}
                            onClick={() =>
                              deleteRecord(
                                record.id
                              )
                            }
                            disabled={
                              deletingId ===
                              record.id
                            }
                          >
                            <Trash2
                              size={16}
                            />
                          </button>
                        </div>
                      </article>
                    );
                  }
                )}
              </div>
            )}

            {!recordsLoading &&
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

          {/* RECENT PAYMENTS */}

          <section
            className={
              styles.paymentsCard
            }
          >
            <div
              className={
                styles.cardHeader
              }
            >
              <div>
                <h2>
                  Recent Payments
                </h2>

                <p>
                  Latest payment activity
                  associated with finance.
                </p>
              </div>
            </div>

            {payments.length ===
            0 ? (
              <div
                className={
                  styles.noPayments
                }
              >
                No recent payments.
              </div>
            ) : (
              <div
                className={
                  styles.paymentList
                }
              >
                {payments.map(
                  (payment) => (
                    <div
                      key={
                        payment.id
                      }
                      className={
                        styles.paymentItem
                      }
                    >
                      <div
                        className={
                          styles.paymentIcon
                        }
                      >
                        <CheckCircle2
                          size={17}
                        />
                      </div>

                      <div
                        className={
                          styles.paymentInfo
                        }
                      >
                        <strong>
                          {
                            payment.customer_name
                          }
                        </strong>

                        <span>
                          {payment.purpose ||
                            "Payment"}
                        </span>
                      </div>

                      <div
                        className={
                          styles.paymentReference
                        }
                      >
                        <span>
                          Reference
                        </span>

                        <strong>
                          {payment.reference ||
                            "—"}
                        </strong>
                      </div>

                      <div
                        className={
                          styles.paymentAmount
                        }
                      >
                        {formatMoney(
                          payment.amount_ghs
                        )}
                      </div>

                      <span
                        className={
                          styles.paymentStatus
                        }
                      >
                        {formatText(
                          payment.status
                        )}
                      </span>
                    </div>
                  )
                )}
              </div>
            )}
          </section>

          {/* RECENT RECEIPTS */}

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
                <h2>
                  Recent Receipts
                </h2>

                <p>
                  Recently issued receipts
                  and payment confirmations.
                </p>
              </div>

              <a
                href="/admin/receipts"
                className={
                  styles.viewAllLink
                }
              >
                View All Receipts →
              </a>
            </div>

            {receipts.length ===
            0 ? (
              <div
                className={
                  styles.noPayments
                }
              >
                No recent receipts.
              </div>
            ) : (
              <div
                className={
                  styles.receiptList
                }
              >
                {receipts.map(
                  (receipt) => (
                    <a
                      key={
                        receipt.id
                      }
                      href={`/admin/receipts/${receipt.id}`}
                      className={
                        styles.receiptItem
                      }
                    >
                      <div
                        className={
                          styles.receiptIcon
                        }
                      >
                        <FileText
                          size={17}
                        />
                      </div>

                      <div
                        className={
                          styles.receiptInfo
                        }
                      >
                        <strong>
                          {
                            receipt.receipt_number
                          }
                        </strong>

                        <span>
                          {formatText(
                            receipt.receipt_type
                          )}
                        </span>
                      </div>

                      <div
                        className={
                          styles.receiptAmount
                        }
                      >
                        {formatMoney(
                          receipt.amount_ghs
                        )}
                      </div>

                      <div
                        className={
                          styles.receiptDate
                        }
                      >
                        {formatDate(
                          receipt.issued_at
                        )}
                      </div>
                    </a>
                  )
                )}
              </div>
            )}
          </section>
        </div>
      </main>

      {/* MODAL */}

      {showModal && (
        <div
          className={
            styles.modalBackdrop
          }
          onMouseDown={(event) => {
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
          >
            <div
              className={
                styles.modalHeader
              }
            >
              <div>
                <span
                  className={
                    styles.eyebrow
                  }
                >
                  Finance
                </span>

                <h2>
                  {editingRecord
                    ? "Edit record"
                    : "Add record"}
                </h2>

                <p>
                  Enter the financial
                  record details below.
                </p>
              </div>

              <button
                type="button"
                className={
                  styles.closeButton
                }
                onClick={
                  closeModal
                }
                disabled={saving}
              >
                <X size={18} />
              </button>
            </div>

            <div
              className={
                styles.modalForm
              }
            >
              <div
                className={
                  styles.formGrid
                }
              >
                <div
                  className={
                    styles.field
                  }
                >
                  <label>
                    Record Type
                  </label>

                  <select
                    value={
                      form.record_type
                    }
                    onChange={(
                      event
                    ) =>
                      handleFormChange(
                        "record_type",
                        event.target
                          .value
                      )
                    }
                  >
                    <option value="income">
                      Income
                    </option>

                    <option value="expense">
                      Expense
                    </option>
                  </select>
                </div>

                <div
                  className={
                    styles.field
                  }
                >
                  <label>
                    Amount (GH₵)
                  </label>

                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={
                      form.amount_ghs
                    }
                    onChange={(
                      event
                    ) =>
                      handleFormChange(
                        "amount_ghs",
                        event.target
                          .value
                      )
                    }
                    placeholder="0.00"
                    required
                  />
                </div>

                <div
                  className={
                    styles.field
                  }
                >
                  <label>
                    Date
                  </label>

                  <input
                    type="date"
                    value={
                      form.record_date
                    }
                    onChange={(
                      event
                    ) =>
                      handleFormChange(
                        "record_date",
                        event.target
                          .value
                      )
                    }
                    required
                  />
                </div>

                <div
                  className={
                    styles.field
                  }
                >
                  <label>
                    Category
                  </label>

                  <input
                    type="text"
                    value={
                      form.category
                    }
                    onChange={(
                      event
                    ) =>
                      handleFormChange(
                        "category",
                        event.target
                          .value
                      )
                    }
                    placeholder="e.g. Equipment"
                    required
                  />
                </div>
              </div>

              <div
                className={
                  styles.field
                }
              >
                <label>
                  Source
                </label>

                <input
                  type="text"
                  value={
                    form.source_label
                  }
                  onChange={(
                    event
                  ) =>
                    handleFormChange(
                      "source_label",
                      event.target
                        .value
                    )
                  }
                  placeholder="e.g. Store sale"
                  required
                />
              </div>

              <div
                className={
                  styles.field
                }
              >
                <label>
                  Description
                </label>

                <textarea
                  value={
                    form.description
                  }
                  onChange={(
                    event
                  ) =>
                    handleFormChange(
                      "description",
                      event.target
                        .value
                    )
                  }
                  placeholder="Describe this finance record..."
                  rows={4}
                  required
                />
              </div>

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
                  disabled={saving}
                >
                  Cancel
                </button>

                <button
                  type="button"
                  className={
                    styles.primaryButton
                  }
                  onClick={
                    saveRecord
                  }
                  disabled={saving}
                >
                  <CheckCircle2
                    size={16}
                  />

                  {saving
                    ? "Saving..."
                    : editingRecord
                      ? "Save Changes"
                      : "Create Record"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/* =========================================================
   SUMMARY CARD
========================================================= */

function SummaryCard({
  icon,
  label,
  value,
  className,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  className: string;
}) {
  return (
    <article
      className={
        styles.summaryCard
      }
    >
      <div
        className={`${styles.summaryIcon} ${className}`}
      >
        {icon}
      </div>

      <div>
        <span>{label}</span>

        <strong>
          {value}
        </strong>
      </div>
    </article>
  );
}