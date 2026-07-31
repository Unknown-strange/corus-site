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
  rejection_reason: string | null;
};

export const DUMMY_RESERVATIONS: Reservation[] = [
  {
    id: "1",
    status: "approved",
    requested_start: "2026-07-12T10:00:00Z",
    requested_end: "2026-07-12T12:00:00Z",
    purpose: "Photoshoot",
    rejection_reason: null,
  },
  {
    id: "2",
    status: "rejected",
    requested_start: "2026-07-12T10:00:00Z",
    requested_end: "2026-07-12T12:00:00Z",
    purpose: "Podcast",
    rejection_reason: "Studio already booked for that slot.",
  },
  {
    id: "3",
    status: "pending",
    requested_start: "2026-07-12T10:00:00Z",
    requested_end: "2026-07-12T12:00:00Z",
    purpose: "Podcast",
    rejection_reason: null,
  },
  {
    id: "4",
    status: "approved",
    requested_start: "2026-07-12T10:00:00Z",
    requested_end: "2026-07-12T12:00:00Z",
    purpose: "Photoshoot",
    rejection_reason: null,
  },
  {
    id: "5",
    status: "rejected",
    requested_start: "2026-07-12T10:00:00Z",
    requested_end: "2026-07-12T12:00:00Z",
    purpose: "Podcast",
    rejection_reason: "Outside opening hours.",
  },
  {
    id: "6",
    status: "pending",
    requested_start: "2026-07-12T10:00:00Z",
    requested_end: "2026-07-12T12:00:00Z",
    purpose: "Podcast",
    rejection_reason: null,
  },
];

/**
 * The API has seven statuses; the design draws three badges. Everything is
 * mapped so real data can never render an unlabelled row.
 */
export const STATUS_LABELS: Record<ReservationStatus, string> = {
  pending: "Pending",
  approved: "Approved",
  rejected: "Rejected",
  payment_pending: "Payment Due",
  reserved: "Reserved",
  expired: "Expired",
  cancelled: "Cancelled",
};

/** Which of the three badge treatments each status uses. */
export const STATUS_TONE: Record<ReservationStatus, "positive" | "negative" | "waiting"> = {
  pending: "waiting",
  payment_pending: "waiting",
  approved: "positive",
  reserved: "positive",
  rejected: "negative",
  expired: "negative",
  cancelled: "negative",
};

/*
 * Dates are formatted from UTC parts on purpose.
 *
 * Ghana is GMT+0 all year, so UTC *is* the studio's wall clock — and reading
 * fixed parts keeps the server and browser output identical, which a
 * locale-dependent format would not.
 */
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
