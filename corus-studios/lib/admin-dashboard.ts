import type { LucideIcon } from "lucide-react";
import {
  CalendarDays,
  Camera,
  ShoppingBag,
  Package,
} from "lucide-react";

/* =========================================================
   DASHBOARD API TYPES
========================================================= */

export type DashboardSummary = {
  pending_reservation_approvals: number;

  pending_reservations_top: Array<{
    id: string;
    customer_email: string;
    customer_name: string;
    requested_start: string;
    requested_end: string;
    purpose: string;
    created_at: string;
  }>;

  low_stock_products: Array<{
    id: string;
    name: string;
    slug: string;
    stock: number;
    low_stock_threshold: number;
  }>;

  low_stock_count: number;

  todays_bookings: Array<{
    id: string;
    user_id: string;
    session_type_name: string;
    slot_starts_at: string;
    slot_ends_at: string;
    status: string;
  }>;

  todays_bookings_count: number;

  active_rentals: number;

  pending_orders: number;

  payments_today_ghs: string;

  financial_summary: {
    total_income_ghs: string;
    total_expenses_ghs: string;
    profit_ghs: string;
    period_start: string;
    period_end: string;
  };

  studio_timezone: string;
};

/* =========================================================
   ANALYTICS TYPES
========================================================= */

export type AnalyticsPoint = {
  bucket: string;
  count: number;
  revenue_ghs: string;
};

export type AnalyticsItem = {
  id: string;
  name: string;
  count: number;
  revenue_ghs: string;
};

export type AnalyticsResponse = {
  interval: "day" | "week" | "month";
  period_start: string;
  period_end: string;
  total_count: number;
  total_revenue_ghs: string;
  points: AnalyticsPoint[];
  top_items: AnalyticsItem[];
};

export type AnalyticsOverview = {
  interval: "day" | "week" | "month";
  period_start: string;
  period_end: string;

  bookings: AnalyticsResponse;
  rentals: AnalyticsResponse;
  products: AnalyticsResponse;

  studio_timezone: string;
};

/* =========================================================
   ACTIVITY TYPES
========================================================= */

export type DashboardActivity = {
  id: string;
  event_type: string;
  title: string;
  description: string;
  user_id: string;
  occurred_at: string;
  reference_id: string;
};

export type DashboardActivityResponse = {
  items: DashboardActivity[];
  total: number;
  page: number;
  limit: number;
  pages: number;
};

/* =========================================================
   STAT CARD
========================================================= */

export type StatCard = {
  id: string;
  label: string;
  value: string;
  delta: string;
  icon: LucideIcon;
  color: string;
};

/* =========================================================
   DEFAULT STATS
========================================================= */

export const STAT_CARDS: StatCard[] = [
  {
    id: "bookings",
    label: "Today's Bookings",
    value: "0",
    delta: "0%",
    icon: CalendarDays,
    color: "#ff5b00",
  },

  {
    id: "rentals",
    label: "Active Rentals",
    value: "0",
    delta: "0%",
    icon: Camera,
    color: "#2563eb",
  },

  {
    id: "orders",
    label: "Pending Orders",
    value: "0",
    delta: "0%",
    icon: ShoppingBag,
    color: "#22c55e",
  },
];

/* =========================================================
   TREND SERIES
========================================================= */

export type TrendSeriesId =
  | "bookings"
  | "rentals"
  | "products";

export type TrendSeries = {
  id: TrendSeriesId;
  title: string;
  metricLabel: string;
  icon: LucideIcon;
};

export const TREND_SERIES: TrendSeries[] = [
  {
    id: "bookings",
    title: "Bookings",
    metricLabel: "Booking",
    icon: CalendarDays,
  },

  {
    id: "rentals",
    title: "Rentals",
    metricLabel: "Rental",
    icon: Camera,
  },

  {
    id: "products",
    title: "Store Products",
    metricLabel: "Sale",
    icon: Package,
  },
];

/* =========================================================
   RANGE OPTIONS
========================================================= */

export const RANGE_OPTIONS = [
  {
    days: 7,
    label: "7 Days",
  },

  {
    days: 30,
    label: "30 Days",
  },

  {
    days: 90,
    label: "90 Days",
  },
];

/* =========================================================
   API → CHART DATA
========================================================= */

export type TrendPoint = {
  date: string;
  value: number;
};

export function getAnalyticsPoints(
  response: AnalyticsResponse
): TrendPoint[] {
  return response.points.map((point) => ({
    date: point.bucket,
    value: point.count,
  }));
}

/* =========================================================
   SUMMARISE CHART
========================================================= */

export function summarise(
  points: TrendPoint[]
) {
  if (!points.length) {
    return {
      peakDay: "N/A",
      average: "0",
      total: 0,
    };
  }

  const peak = points.reduce(
    (highest, current) =>
      current.value > highest.value
        ? current
        : highest
  );

  const total = points.reduce(
    (sum, point) =>
      sum + point.value,
    0
  );

  const average =
    total / points.length;

  return {
    peakDay: weekdayName(
      peak.date
    ),
    average:
      Math.round(average).toString(),
    total,
  };
}

/* =========================================================
   DATE LABEL
========================================================= */

export function weekdayName(
  dateStr: string
) {
  const date = new Date(
    `${dateStr}T12:00:00`
  );

  if (Number.isNaN(date.getTime())) {
    return dateStr;
  }

  return date.toLocaleDateString(
    "en-US",
    {
      weekday: "short",
    }
  );
}

/* =========================================================
   ACTIVITY TIME
========================================================= */

export function formatRelativeTime(
  value: string
) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const now = Date.now();
  const diff =
    now - date.getTime();

  const minute =
    60 * 1000;

  const hour =
    60 * minute;

  const day =
    24 * hour;

  if (diff < minute) {
    return "Just now";
  }

  if (diff < hour) {
    return `${Math.floor(
      diff / minute
    )}m ago`;
  }

  if (diff < day) {
    return `${Math.floor(
      diff / hour
    )}h ago`;
  }

  if (diff < 7 * day) {
    return `${Math.floor(
      diff / day
    )}d ago`;
  }

  return date.toLocaleDateString(
    "en-GB",
    {
      day: "2-digit",
      month: "short",
    }
  );
}