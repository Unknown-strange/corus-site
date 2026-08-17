// lib/reservations.ts

export type ReservationStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "payment_pending"
  | "reserved"
  | "expired"
  | "cancelled";

export type Reservation = {
  id: string;
  status: ReservationStatus;
  requested_start: string;
  requested_end: string;
  purpose: string | null;
  notes?: string | null;
  rejection_reason: string | null;
  approved_price_ghs?: string;
  deposit_amount_ghs?: string;
  balance_due_ghs?: string;
  approved_at?: string | null;
  payment_deadline?: string | null;
  paystack_reference?: string | null;
  created_at?: string;
  updated_at?: string;
};

export const STATUS_LABELS: Record<ReservationStatus, string> = {
  pending: "Pending",
  approved: "Approved",
  rejected: "Rejected",
  payment_pending: "Payment Due",
  reserved: "Reserved",
  expired: "Expired",
  cancelled: "Cancelled",
};

export const STATUS_TONE: Record<ReservationStatus, "positive" | "negative" | "waiting"> = {
  pending: "waiting",
  payment_pending: "waiting",
  approved: "positive",
  reserved: "positive",
  rejected: "negative",
  expired: "negative",
  cancelled: "negative",
};

const MERIDIEM_HOURS = (hour: number) => (hour % 12 === 0 ? 12 : hour % 12);

export function formatRequestDate(iso: string) {
  const d = new Date(iso);
  const day = String(d.getUTCDate()).padStart(2, "0");
  const month = String(d.getUTCMonth() + 1).padStart(2, "0");
  return `${day}/${month}/${d.getUTCFullYear()}`;
}

export function formatRequestTime(iso: string) {
  const d = new Date(iso);
  const hour = d.getUTCHours();
  const minutes = d.getUTCMinutes();
  const suffix = hour < 12 ? "am" : "pm";
  const clock = MERIDIEM_HOURS(hour);
  return minutes === 0
    ? `${clock}${suffix}`
    : `${clock}:${String(minutes).padStart(2, "0")}${suffix}`;
}