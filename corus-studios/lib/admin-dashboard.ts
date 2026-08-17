// lib/admin-dashboard.ts

import type { LucideIcon } from "lucide-react";
import {
  CalendarDays,
  Camera,
  ShoppingBag,
} from "lucide-react";


// ─── Types from API ──────────────────────────────────────

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


// ─── Dashboard Card Types ───────────────────────────────

export type StatCard = {
  id: string;
  label: string;
  value: string;
  delta: string;
  icon: LucideIcon;
  color: string;
};


// ─── Placeholder Stats ──────────────────────────────────

export const STAT_CARDS: StatCard[] = [
  {
    id: "bookings",
    label: "Today's Bookings",
    value: "0",
    delta: "+0%",
    icon: CalendarDays,
    color: "#ff5b00",
  },

  {
    id: "rentals",
    label: "Active Rentals",
    value: "0",
    delta: "+0%",
    icon: Camera,
    color: "#2563eb",
  },

  {
    id: "orders",
    label: "Pending Orders",
    value: "0",
    delta: "+0%",
    icon: ShoppingBag,
    color: "#22c55e",
  },
];



// ─── Trend Charts ───────────────────────────────────────

export type TrendSeries = {
  id: string;
  title: string;
  metricLabel: string;
};


export const TREND_SERIES: TrendSeries[] = [

  {
    id: "bookings",
    title: "Bookings",
    metricLabel: "Booking",
  },

  {
    id: "rentals",
    title: "Rentals",
    metricLabel: "Rental",
  },

  {
    id: "orders",
    title: "Orders",
    metricLabel: "Order",
  },

];



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



// ─── Placeholder Chart Data ─────────────────────────────

export function getTrendPoints(
  seriesId: string,
  days: number
) {

  const data = [];

  const now = new Date();


  for (
    let i = days - 1;
    i >= 0;
    i--
  ) {

    const date = new Date(now);

    date.setDate(
      date.getDate() - i
    );


    data.push({

      date:
        date
          .toISOString()
          .split("T")[0],

      value:
        Math.floor(
          Math.random() * 50
        ) + 10,

    });

  }


  return data;
}



export function summarise(
  points: {
    date:string;
    value:number;
  }[]
) {

  if (!points.length) {

    return {
      peakDay:"N/A",
      average:"0",
    };

  }


  const peak =
    points.reduce(
      (a,b)=>
        a.value > b.value
        ? a
        : b
    );


  const avg =
    points.reduce(
      (sum,p)=>
        sum + p.value,
      0
    )
    /
    points.length;



  return {

    peakDay:
      new Date(
        peak.date
      ).toLocaleDateString(
        "en-US",
        {
          weekday:"short",
        }
      ),


    average:
      Math.round(avg)
      .toString(),

  };

}



export function weekdayName(
  dateStr:string
) {

  return new Date(
    dateStr
  ).toLocaleDateString(
    "en-US",
    {
      weekday:"short",
    }
  );

}