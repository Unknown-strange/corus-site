/**
 * PLACEHOLDER DATA for the admin homepage — delete once the API is wired up.
 *
 * ⚠️ THE TREND CHARTS HAVE NO ENDPOINT BEHIND THEM.
 *
 * `GET /admin/dashboard/summary` returns `DashboardSummaryResponse`, which is
 * point-in-time counts only:
 *
 *   { pending_reservation_approvals, pending_reservations_top[],
 *     low_stock_products[], low_stock_count, todays_bookings[],
 *     todays_bookings_count, active_rentals, pending_orders,
 *     payments_today_ghs, financial_summary{...}, studio_timezone }
 *
 * Nothing in /admin/dashboard or /admin/finance groups records by day, so
 * there is no source for "last 7 days" buckets, "Peak Day" or "Avg. Daily".
 *
 * What the backend needs to add, roughly:
 *   GET /admin/dashboard/trends?metric=bookings|rentals&days=7
 *     → [{ date: "2026-07-29", value: 12 }, ...]
 *
 * `TrendPoint` below is deliberately that shape, so swapping the source is a
 * straight substitution. Peak day and average are DERIVED from the points
 * rather than stored, so they stay correct whatever data arrives.
 */

export type TrendPoint = {
  /** ISO date, as the API would return it */
  date: string;
  value: number;
};

export type TrendSeries = {
  id: string;
  title: string;
  /** Legend label for the single series */
  metricLabel: string;
};

export type StatCard = {
  id: string;
  /**
   * Rendered one line per entry. The design always breaks after "Total", so
   * the split is stated here rather than left to however the text happens to
   * wrap at a given card width.
   */
  labelLines: [string, string];
  /** Pre-formatted so currency and counts can share one card */
  value: string;
  delta: string;
};

/**
 * Maps to the summary endpoint where it can:
 *   Total Revenue      → financial_summary.total_income_ghs / payments_today_ghs
 *   Total Bookings     → todays_bookings_count covers the delta only; there is
 *                        no lifetime total in the API
 *   Total Gadget Rentals → active_rentals is *active*, not a running total
 */
export const STAT_CARDS: StatCard[] = [
  { id: "bookings", labelLines: ["Total", "Bookings"], value: "16", delta: "+18" },
  { id: "rentals", labelLines: ["Total", "Gadget Rentals"], value: "74", delta: "+16" },
  { id: "revenue", labelLines: ["Total", "Revenue"], value: "GH₵7,400", delta: "+GH₵16" },
];

export const TREND_SERIES: TrendSeries[] = [
  { id: "bookings", title: "Booking Trends", metricLabel: "Bookings" },
  { id: "rentals", title: "Gadget Rental Trends", metricLabel: "Rentals" },
];

/**
 * 30 days of fixed values so the range selector has something real to filter,
 * and so server and client render identically — random data would produce a
 * hydration mismatch.
 *
 * Dates count back from a fixed anchor for the same reason: deriving them from
 * `new Date()` would differ between the server render and the browser.
 */
const ANCHOR = "2026-07-29";

const VALUES: Record<string, number[]> = {
  bookings: [
    64, 118, 92, 76, 131, 88, 104, 72, 96, 143, 81, 110, 67, 125, 94, 86, 138,
    73, 101, 119, 90, 78, 134, 97, 112, 69, 128, 105, 149, 83,
  ],
  rentals: [
    58, 97, 126, 71, 109, 84, 133, 66, 118, 90, 102, 75, 141, 88, 113, 79, 95,
    122, 68, 106, 91, 130, 77, 114, 99, 85, 137, 70, 121, 93,
  ],
  orders: [
    82, 74, 115, 93, 60, 128, 87, 105, 71, 136, 99, 80, 117, 65, 124, 96, 108,
    73, 132, 89, 101, 76, 119, 94, 63, 127, 111, 84, 140, 98,
  ],
};

function shiftDate(iso: string, days: number) {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Oldest first, ending on the anchor — the order a chart reads left to right. */
export function getTrendPoints(seriesId: string, days: number): TrendPoint[] {
  const values = VALUES[seriesId] ?? VALUES.bookings;
  const slice = values.slice(0, days);

  return slice.map((value, index) => ({
    date: shiftDate(ANCHOR, index - (slice.length - 1)),
    value,
  }));
}

export const RANGE_OPTIONS = [
  { days: 7, label: "Last 7 Days" },
  { days: 30, label: "Last 30 Days" },
];

const WEEKDAYS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

/*
 * Formatted from UTC parts on purpose: Ghana is GMT+0 all year, so UTC is the
 * studio's wall clock, and fixed parts render identically on server and client.
 */
export function weekdayName(iso: string) {
  return WEEKDAYS[new Date(`${iso}T00:00:00Z`).getUTCDay()];
}

export function shortDate(iso: string) {
  const d = new Date(`${iso}T00:00:00Z`);
  return `${String(d.getUTCDate()).padStart(2, "0")}/${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

/** Peak day and average, derived so they can never disagree with the bars. */
export function summarise(points: TrendPoint[]) {
  if (points.length === 0) {
    return { peakDay: "—", average: 0 };
  }

  const peak = points.reduce((best, p) => (p.value > best.value ? p : best), points[0]);
  const total = points.reduce((sum, p) => sum + p.value, 0);

  return {
    peakDay: weekdayName(peak.date),
    average: Math.round(total / points.length),
  };
}
