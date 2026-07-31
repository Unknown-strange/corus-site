/**
 * PLACEHOLDER DATA — delete once checkout is wired up.
 *
 * The real source is `GET /cart`, which returns `CartResponse`. Field names
 * below match that schema so swapping the source is a straight substitution:
 *
 *   CartResponse   { id, items[], total_ghs, item_count, updated_at }
 *   CartItemResponse { product_id, product_name, product_slug,
 *                      unit_price_ghs, quantity, line_total_ghs,
 *                      image_url, stock }
 *
 * ⚠️ SERVICE FEE AND DELIVERY FEE DO NOT EXIST IN THE API.
 *
 * The design's summary lists Sub-Total, Service Fee and Delivery Fee, but the
 * cart returns a single `total_ghs` and the order returns a single
 * `total_ghs` — there is no fee breakdown anywhere in the backend, and the
 * documented business rules say collection is at the studio with no shipping.
 *
 * The two fees are therefore constants here, clearly marked, so the screen
 * renders as drawn. They are NOT invented into the response shape, and the
 * grand total must come from the API once wired — the frontend must never be
 * the authority on what a customer is charged.
 */
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

export const DUMMY_CART_ITEMS: CartItem[] = [
  {
    product_id: "1",
    product_name: "Canon 6D Mark II",
    product_slug: "canon-6d-mark-ii",
    unit_price_ghs: 5000,
    quantity: 1,
    line_total_ghs: 5000,
    image_url: "/gallery/gadget1.png",
    stock: 4,
  },
  {
    product_id: "4",
    product_name: "Canon 70-200mm",
    product_slug: "canon-70-200mm",
    unit_price_ghs: 6000,
    quantity: 1,
    line_total_ghs: 6000,
    image_url: "/gallery/gadget1.png",
    stock: 2,
  },
  {
    product_id: "5",
    product_name: "Nikon z50 Mark II",
    product_slug: "nikon-z50-mark-ii",
    unit_price_ghs: 15000,
    quantity: 1,
    line_total_ghs: 15000,
    image_url: "/gallery/gadget1.png",
    stock: 1,
  },
];

/** Placeholder only — see the warning above. No backend field backs these. */
export const PLACEHOLDER_SERVICE_FEE_GHS = 250;
export const PLACEHOLDER_DELIVERY_FEE_GHS = 250;

export function cartSubtotal(items: CartItem[]) {
  return items.reduce((sum, item) => sum + item.line_total_ghs, 0);
}

/**
 * Two decimals with thousands separators, matching the design's "14,000.00".
 *
 * The locale is pinned rather than left to the runtime: an unpinned
 * `toLocaleString` can group differently on the server and in the browser,
 * which shows up as a hydration mismatch.
 */
const MONEY = new Intl.NumberFormat("en-US", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function formatAmount(amount: number) {
  return MONEY.format(amount);
}

export function formatGhsAmount(amount: number) {
  return `GH₵${MONEY.format(amount)}`;
}
