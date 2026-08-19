export const GALLERY_CATEGORIES = [
  "Birthday",
  "Graduation",
  "Matriculation",
  "Lifestyle (weddings and funerals)",
  "Agenda",
] as const;

export type GalleryCategory = (typeof GALLERY_CATEGORIES)[number];

export type GalleryContentItem = {
  id: string;
  image_url: string;
  category: string | null;
  caption: string | null;
  title: string | null;
};

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export async function fetchGalleryContent(): Promise<GalleryContentItem[]> {
  const response = await fetch(`${API_BASE}/catalog/content/gallery`);

  if (!response.ok) {
    throw new Error("Failed to load gallery content");
  }

  const data = (await response.json()) as GalleryContentItem[];
  return data.filter((item) => Boolean(item.image_url));
}
