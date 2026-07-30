/**
 * PLACEHOLDER DATA — delete once the shop catalogue is wired up.
 *
 * The real source is `GET /catalog/products`, which returns
 * `ProductPublicResponse`. Field names below match that schema so swapping the
 * source is a straight substitution:
 *
 *   { id, name, slug, description, price, stock, image_url, category }
 *
 * `condition` is the exception: the design labels cards "Brand New" / "UK
 * Used", but `Product` has no such column and the API never returns it. It is
 * kept here so the cards render as drawn, and flagged as needing a backend
 * field before the catalogue goes live — not invented into the response shape.
 *
 * Every entry uses the same placeholder image because that is the only gadget
 * photo in the repo. `stock: 0` is what the design draws as "Out of Stock".
 */
export type ProductCondition = "Brand New" | "UK Used";

export type Product = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  price: number;
  stock: number;
  image_url: string;
  /** Not part of ProductPublicResponse — see note above. */
  condition: ProductCondition | null;
};

export const DUMMY_PRODUCTS: Product[] = [
  {
    id: "1",
    name: "Canon 6D Mark II",
    slug: "canon-6d-mark-ii",
    description: "Camera Body Only",
    price: 5000,
    stock: 4,
    image_url: "/gallery/gadget1.png",
    condition: "Brand New",
  },
  {
    id: "2",
    name: "Canon 50mm lens",
    slug: "canon-50mm-lens",
    description: null,
    price: 3500,
    stock: 0,
    image_url: "/gallery/gadget1.png",
    condition: "UK Used",
  },
  {
    id: "3",
    name: "Godox TT520 II",
    slug: "godox-tt520-ii",
    description: null,
    price: 3000,
    stock: 6,
    image_url: "/gallery/gadget1.png",
    condition: null,
  },
  {
    id: "4",
    name: "Canon 70-200mm",
    slug: "canon-70-200mm",
    description: null,
    price: 6000,
    stock: 2,
    image_url: "/gallery/gadget1.png",
    condition: "Brand New",
  },
  {
    id: "5",
    name: "Nikon z50 Mark II",
    slug: "nikon-z50-mark-ii",
    description: null,
    price: 15000,
    stock: 1,
    image_url: "/gallery/gadget1.png",
    condition: "UK Used",
  },
];

/**
 * Thousands separators, matching the design's "GH₵5,000".
 *
 * The locale is pinned rather than left to the runtime: an unpinned
 * `toLocaleString` can group differently on the server and in the browser,
 * which shows up as a hydration mismatch.
 */
const GROUPED = new Intl.NumberFormat("en-US");

export function formatGhs(amount: number) {
  return `GH₵${GROUPED.format(amount)}`;
}

export function findProduct(id: string) {
  return DUMMY_PRODUCTS.find((product) => product.id === id) ?? null;
}
