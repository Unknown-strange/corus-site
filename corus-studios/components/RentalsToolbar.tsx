"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import styles from "./RentalsToolbar.module.css";

/**
 * Static category list – the backend has no category support for rentals yet.
 * These buttons only filter the already‑loaded list in the parent component.
 */
export const CATEGORIES = ["Cameras", "Lenses", "Lights"] as const;
export type Category = (typeof CATEGORIES)[number];

type Props = {
  /** Current search term, passed from parent */
  search?: string;
  /** Callback when search input changes */
  onSearchChange?: (value: string) => void;
  /** Currently selected category (or null) */
  category?: Category | null;
  /** Callback when a category button is clicked */
  onCategoryChange?: (value: Category | null) => void;
};

export default function RentalsToolbar({
  search,
  onSearchChange,
  category,
  onCategoryChange,
}: Props) {
  const router = useRouter();

  /** Toggle category selection – if the same category is clicked again, deselect it */
  function handleCategory(next: Category) {
    if (onCategoryChange) {
      onCategoryChange(category === next ? null : next);
    } else {
      // If no handler is provided, navigate back to the rentals page (fallback)
      router.push("/rentals");
    }
  }

  /** Navigate to the cart page */
  const handleCartClick = () => {
    router.push("/cart");
  };

  return (
    <div className={styles.band}>
      <h1 className={styles.heading}>Rent a Gadget Today</h1>

      <div className={styles.bar}>
        {/* Search bar */}
        <div className={styles.searchWrap}>
          <Search className={styles.searchIcon} size={20} aria-hidden="true" />
          <input
            className={styles.search}
            type="search"
            placeholder="Search"
            aria-label="Search gadgets"
            value={search ?? ""}
            onChange={(e) =>
              onSearchChange ? onSearchChange(e.target.value) : router.push("/rentals")
            }
          />
        </div>

        <div className={styles.filters}>
          {/* Category filter group – client‑side only */}
          <div className={styles.filterGroup}>
            <span className={styles.filterCaption}>Filter</span>
            <div className={styles.filterButtons}>
              {CATEGORIES.map((name) => (
                <button
                  key={name}
                  type="button"
                  className={`${styles.filter} ${category === name ? styles.filterActive : ""}`}
                  aria-pressed={category === name}
                  onClick={() => handleCategory(name)}
                >
                  {name}
                </button>
              ))}
            </div>
          </div>

          {/* Cart icon – navigates to /cart */}
          <button
            type="button"
            className={styles.cart}
            aria-label="Cart"
            onClick={handleCartClick}
          >
            <Image
              src="/icons/Cart.png"
              alt=""
              width={30}
              height={30}
              className={styles.cartIcon}
            />
          </button>
        </div>
      </div>
    </div>
  );
}