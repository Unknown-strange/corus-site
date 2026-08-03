"use client";

import { useState } from "react";
import StoreCard from "./StoreCard";
import StoreToolbar, { type Category } from "./StoreToolbar";
import { DUMMY_PRODUCTS } from "@/lib/store-products";
import styles from "./StoreScreen.module.css";

export default function StoreScreen() {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<Category | null>(null);
  const [notice, setNotice] = useState("");

  const query = search.trim().toLowerCase();
  const products = query
    ? DUMMY_PRODUCTS.filter((product) => product.name.toLowerCase().includes(query))
    : DUMMY_PRODUCTS;

  /**
   * Category filtering is deliberately not implemented.
   *
   * Unlike rent equipment, shop products *do* have categories — the API
   * exposes `GET /catalog/categories` and `ProductPublicResponse.category`.
   * But the placeholder products here have no category assigned, so filtering
   * would hide everything. The buttons keep their selected state; wire them to
   * the `category` query parameter once the catalogue is live.
   */
  function handleCategory(next: Category | null) {
    setCategory(next);
    setNotice(
      next
        ? "Category filters aren't connected yet — the placeholder products have no category assigned."
        : ""
    );
  }

  /**
   * `POST /cart/items { product_id, quantity }` exists and is the right
   * endpoint, but it is customer-only and the app has no auth state or API
   * client yet. See docs/FRONTEND.md "Project conventions".
   */
  function handleAddToCart() {
    setNotice("The cart isn't connected yet — adding items needs sign-in and the API client.");
  }

  return (
    <div className={styles.page}>
      <StoreToolbar
        search={search}
        onSearchChange={setSearch}
        category={category}
        onCategoryChange={handleCategory}
      />

      {notice ? (
        <p className={styles.notice} role="status">
          {notice}
        </p>
      ) : null}

      {products.length > 0 ? (
        <div className={styles.grid}>
          {products.map((product) => (
            <StoreCard key={product.id} product={product} onCartClick={handleAddToCart} />
          ))}
        </div>
      ) : (
        <p className={styles.empty}>No products match “{search}”.</p>
      )}

      <div className={styles.moreRow}>
        <button
          type="button"
          className={styles.more}
          onClick={() =>
            setNotice("Nothing more to load — the catalogue is placeholder data until the API is wired up.")
          }
        >
          View More
        </button>
      </div>
    </div>
  );
}
