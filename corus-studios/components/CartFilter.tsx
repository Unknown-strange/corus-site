"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import styles from "./CartFilter.module.css";

export const CATEGORIES = ["Cameras", "Lenses", "Lights"] as const;
export type Category = (typeof CATEGORIES)[number];

type Props = {
  search?: string;
  onSearchChange?: (value: string) => void;
  category?: Category | null;
  onCategoryChange?: (value: Category | null) => void;
  onCartClick?: () => void;
};

/**
 * Shared header band for the rentals screens.
 *
 * On the catalogue the handlers are supplied and filtering happens in place.
 * On the gadget detail screen they are omitted, and interacting with the bar
 * sends the visitor back to the catalogue instead.
 */
export default function CartFilter({
  search,
  onSearchChange,
  category,
  onCategoryChange,
  onCartClick,
}: Props) {
  const router = useRouter();

  function handleCategory(next: Category) {
    if (onCategoryChange) {
      onCategoryChange(category === next ? null : next);
      return;
    }
    router.push("/rentals");
  }

  return (
    <div className={styles.band}>
      <div className={styles.bar}>
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

          <button
            type="button"
            className={styles.cart}
            aria-label="Cart"
            onClick={onCartClick}
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
