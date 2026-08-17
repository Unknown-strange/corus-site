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
  price: string; // decimal string from API
  stock: number;
  image_url: string;
  category: {
    id: string;
    name: string;
    slug: string;
    description: string;
    sort_order: number;
  } | null;
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

export type SessionType = {
  id: string;
  name: string;
  slug: string;
  description: string;
  price_ghs: string;  // decimal string
  duration_minutes: number;
};

export type Slot = {
  id: string;
  starts_at: string; // ISO datetime
  ends_at: string;   // ISO datetime
};

// lib/types.ts

export type CartItem = {
  product_id: string;
  product_name: string;
  product_slug: string;
  unit_price_ghs: number;
  quantity: number;
  line_total_ghs: number;
  image_url: string;
  stock: number;
};

export type CartResponse = {
  id: string;
  items: CartItem[];
  total_ghs: string;
  item_count: number;
  updated_at: string;
};

export type OrderCheckoutResponse = {
  order_id: string;
  authorization_url: string;
  reference: string;
  public_key: string;
  amount_ghs: string;
};

export type Order = {
  id: string;
  status: string;
  total_ghs: string;
  paystack_reference: string;
  payment_expires_at: string;
  paid_at: string | null;
  created_at: string;
  updated_at: string;
  items: Array<{
    product_id: string;
    product_name: string;
    unit_price_ghs: string;
    quantity: number;
    line_total_ghs: string;
  }>;
  receipt: {
    receipt_number: string;
    amount_ghs: string;
    issued_at: string;
  } | null;
};
