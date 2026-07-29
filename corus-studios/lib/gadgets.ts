/**
 * PLACEHOLDER DATA — delete once the catalogue is wired up.
 *
 * The real source is `GET /rentals/equipment`, which returns
 * `RentEquipmentPublicResponse`. Field names below deliberately match that
 * schema so swapping the source is a straight substitution:
 *
 *   { id, name, slug, description, daily_rate_ghs, stock, image_url }
 *
 * Every entry uses the same placeholder image because that is the only gadget
 * photo in the repo. `stock: 0` is what the design draws as "Not Available".
 */
export type Gadget = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  daily_rate_ghs: number;
  stock: number;
  image_url: string;
};

export const DUMMY_GADGETS: Gadget[] = [
  {
    id: "1",
    name: "Canon 6D Mark II",
    slug: "canon-6d-mark-ii",
    description: "Camera Body Only",
    daily_rate_ghs: 200,
    stock: 3,
    image_url: "/gallery/gadget1.png",
  },
  {
    id: "2",
    name: "Canon 50mm lens",
    slug: "canon-50mm-lens",
    description: null,
    daily_rate_ghs: 50,
    stock: 2,
    image_url: "/gallery/gadget1.png",
  },
  {
    id: "3",
    name: "Godox TT520 II",
    slug: "godox-tt520-ii",
    description: null,
    daily_rate_ghs: 100,
    stock: 5,
    image_url: "/gallery/gadget1.png",
  },
  {
    id: "4",
    name: "Canon 70-200mm",
    slug: "canon-70-200mm",
    description: null,
    daily_rate_ghs: 150,
    stock: 1,
    image_url: "/gallery/gadget1.png",
  },
  {
    id: "5",
    name: "Nikon z50 Mark II",
    slug: "nikon-z50-mark-ii",
    description: null,
    daily_rate_ghs: 350,
    stock: 2,
    image_url: "/gallery/gadget1.png",
  },
  {
    id: "6",
    name: "Nikkor 180 - 600mm",
    slug: "nikkor-180-600mm",
    description: null,
    daily_rate_ghs: 200,
    stock: 4,
    image_url: "/gallery/gadget1.png",
  },
];

export function findGadget(id: string) {
  return DUMMY_GADGETS.find((gadget) => gadget.id === id) ?? null;
}
