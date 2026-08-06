// lib/types.ts
export type RentEquipment = {
  id: string;
  name: string;
  slug: string;
  description: string;
  daily_rate_ghs: string;
  stock: number;
  image_url: string;
};

export type CatalogProduct = {
  id: string;
  name: string;
  slug: string;
  description: string;
  price: string;
  stock: number;
  image_url: string;
  category: {
    id: string;
    name: string;
    slug: string;
    description: string;
    sort_order: number;
  };
};

export type Reservation = {
  id: string;
  status: string;
  requested_start: string;
  requested_end: string;
  purpose: string;
  notes: string;
  approved_price_ghs: string;
  deposit_amount_ghs: string;
  balance_due_ghs: string;
  approved_at: string | null;
  payment_deadline: string | null;
  paystack_reference: string | null;
  rejection_reason: string | null;
  created_at: string;
  updated_at: string;
};

export type Booking = {
  id: string;
  status: string;
  deposit_amount_ghs: string;
  total_price_ghs: string;
  balance_due_ghs: string;
  paystack_reference: string;
  confirmed_at: string;
  created_at: string;
  session_type_name: string;
  slot_starts_at: string;
  slot_ends_at: string;
  receipt: {
    receipt_number: string;
    amount_ghs: string;
    issued_at: string;
  } | null;
};