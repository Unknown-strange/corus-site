"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import styles from "./StoreToolbar.module.css";

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
 * Shared header band for the store screens.
 *
 * On the catalogue the handlers are supplied and filtering happens in place.
 * On the checkout screen they are omitted, and interacting with the bar sends
 * the visitor back to the catalogue instead.
 */
export default function StoreToolbar({
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
    router.push("/store");
  }

  return (
    <div className={styles.band}>
      <h1 className={styles.heading}>Buy a Gadget Today</h1>

      <div className={styles.bar}>
        <div className={styles.searchWrap}>
          <Search className={styles.searchIcon} size={20} aria-hidden="true" />
          <input
            className={styles.search}
            type="search"
            placeholder="Search"
            aria-label="Search products"
            value={search ?? ""}
            onChange={(e) =>
              onSearchChange ? onSearchChange(e.target.value) : router.push("/store")
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
