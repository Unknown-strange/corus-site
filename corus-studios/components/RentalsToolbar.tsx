"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";

import styles from "./RentalsToolbar.module.css";

type Props = {
  search?: string;
  onSearchChange?: (
    value: string
  ) => void;
};

export default function RentalsToolbar({
  search = "",
  onSearchChange,
}: Props) {
  const router = useRouter();

  const handleSearchChange = (
    value: string
  ) => {
    onSearchChange?.(value);
  };

  const clearSearch = () => {
    onSearchChange?.("");
  };

  const handleCartClick = () => {
    router.push("/cart");
  };

  return (
    <section className={styles.band}>
      <div className={styles.inner}>

        {/* =================================================
            HEADING
        ================================================= */}

        <div className={styles.headingArea}>

          <h1 className={styles.heading}>
            Rent a Gadget Today
          </h1>

          <p className={styles.subheading}>
            Browse available equipment and
            choose what you need for your
            next project.
          </p>
        </div>

        {/* =================================================
            TOOLBAR
        ================================================= */}

        <div className={styles.bar}>

          {/* SEARCH */}

          <div className={styles.searchWrap}>
            <Search
              className={styles.searchIcon}
              size={17}
              aria-hidden="true"
            />

            <input
              className={styles.search}
              type="search"
              placeholder="Search rental equipment..."
              aria-label="Search rental equipment"
              value={search}
              onChange={(event) =>
                handleSearchChange(
                  event.target.value
                )
              }
            />

            {search && (
              <button
                type="button"
                className={styles.clearSearch}
                onClick={clearSearch}
                aria-label="Clear search"
              >
                ×
              </button>
            )}
          </div>

          {/* CART */}

          <button
            type="button"
            className={styles.cart}
            aria-label="Open cart"
            onClick={handleCartClick}
          >
            <Image
              src="/icons/Cart.png"
              alt=""
              width={22}
              height={22}
              className={styles.cartIcon}
            />
          </button>
        </div>
      </div>
    </section>
  );
}