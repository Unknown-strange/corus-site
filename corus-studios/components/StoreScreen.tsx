"use client";

import { useState, useEffect } from "react";
import StoreCard from "./StoreCard";
import StoreToolbar, { type Category } from "./StoreToolbar";
import { CatalogProduct } from "@/lib/types";
import api from "@/lib/api";
import styles from "./StoreScreen.module.css";

export default function StoreScreen() {
  const [products, setProducts] = useState<CatalogProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<Category | null>(null);
  const [notice, setNotice] = useState("");

  // Fetch products from API
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const res = await api.catalog.products();
        if (!res.ok) throw new Error("Failed to load products");
        const data = await res.json();
        // The API returns { items, total, page, limit, pages }
        setProducts(data.items || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error loading products");
      } finally {
        setLoading(false);
      }
    };
    fetchProducts();
  }, []);

  // Client-side search filter (API doesn't support search)
  const query = search.trim().toLowerCase();
  const filtered = products.filter((product) =>
    product.name.toLowerCase().includes(query)
  );

  function handleCategory(next: Category | null) {
    setCategory(next);
    // Note: The API supports category filtering, but we'd need to re-fetch.
    // For now, we keep it client-side until we implement re-fetch on category change.
    setNotice(
      next
        ? "Category filters are client-side only – the API supports category filtering (coming soon)."
        : ""
    );
  }

  async function handleAddToCart(product: CatalogProduct) {
    const token = localStorage.getItem("access_token");
    if (!token) {
      setNotice("Please log in to add items to your cart.");
      return;
    }

    try {
      const res = await api.cart.addItem(
        { product_id: product.id, quantity: 1 },
        token
      );
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.detail || "Failed to add to cart");
      }
      setNotice(`✅ Added "${product.name}" to your cart!`);
      setTimeout(() => setNotice(""), 3000);
    } catch (err: any) {
      setNotice(err.message || "Something went wrong.");
    }
  }

  if (loading) {
    return (
      <div className={styles.page}>
        <StoreToolbar
          search={search}
          onSearchChange={setSearch}
          category={category}
          onCategoryChange={handleCategory}
        />
        <div className={styles.loading}>Loading products...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.page}>
        <StoreToolbar
          search={search}
          onSearchChange={setSearch}
          category={category}
          onCategoryChange={handleCategory}
        />
        <div className={styles.error}>Error: {error}</div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <StoreToolbar
        search={search}
        onSearchChange={setSearch}
        category={category}
        onCategoryChange={handleCategory}
      />

      {notice && (
        <p className={styles.notice} role="status">
          {notice}
        </p>
      )}

      {filtered.length > 0 ? (
        <div className={styles.grid}>
          {filtered.map((product) => (
            <StoreCard
              key={product.id}
              product={product}
              onCartClick={handleAddToCart}
            />
          ))}
        </div>
      ) : (
        <p className={styles.empty}>No products match “{search}”.</p>
      )}

      {/* View More button – disabled since API returns all items (pagination not used yet) */}
      <div className={styles.moreRow}>
        <button
          type="button"
          className={styles.more}
          onClick={() =>
            setNotice("All products are already loaded – no more to show.")
          }
        >
          View More
        </button>
      </div>
    </div>
  );
}