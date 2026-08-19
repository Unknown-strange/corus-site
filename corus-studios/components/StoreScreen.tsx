"use client";

import {
  useCallback,
  useEffect,
  useState,
} from "react";

import StoreCard from "./StoreCard";
import StoreToolbar from "./StoreToolbar";

import type { StoreCategory } from "./StoreToolbar";

import type { CatalogProduct } from "@/lib/types";

import api from "@/lib/api";

import styles from "./StoreScreen.module.css";

export default function StoreScreen() {
  /* =========================================================
     STATE
  ========================================================= */

  const [
    products,
    setProducts,
  ] = useState<CatalogProduct[]>([]);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    error,
    setError,
  ] = useState<string | null>(null);

  const [
    search,
    setSearch,
  ] = useState("");

  const [
    category,
    setCategory,
  ] = useState<string | null>(
    null
  );

  const [
    notice,
    setNotice,
  ] = useState("");

  /* =========================================================
     FETCH PRODUCTS
  ========================================================= */

  const fetchProducts = useCallback(
    async (
      selectedCategory?: string | null
    ) => {
      try {
        setLoading(true);
        setError(null);

        const response =
          await api.catalog.products({
            category:
              selectedCategory ||
              undefined,
          });

        if (!response.ok) {
          throw new Error(
            "Failed to load products"
          );
        }

        const data =
          await response.json();

        /*
         * The catalog endpoint returns:
         *
         * {
         *   items: [],
         *   total,
         *   page,
         *   limit,
         *   pages
         * }
         */

        setProducts(
          Array.isArray(data?.items)
            ? data.items
            : []
        );
      } catch (err) {
        console.error(
          "Failed to load products:",
          err
        );

        setError(
          err instanceof Error
            ? err.message
            : "Error loading products"
        );

        setProducts([]);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  /* =========================================================
     INITIAL LOAD
  ========================================================= */

  useEffect(() => {
    fetchProducts(null);
  }, [fetchProducts]);

  /* =========================================================
     CATEGORY CHANGE
  ========================================================= */

  const handleCategory = (
    nextCategory: string | null
  ) => {
    setCategory(nextCategory);

    /*
     * Fetch the actual filtered products
     * from the backend.
     */

    fetchProducts(nextCategory);
  };

  /* =========================================================
     SEARCH
     ========================================================= */

  const query =
    search
      .trim()
      .toLowerCase();

  /*
   * The catalog API does not currently expose
   * a search parameter, so search remains
   * client-side.
   */

  const filtered =
    products.filter(
      (product) =>
        product.name
          .toLowerCase()
          .includes(query) ||
        product.description
          .toLowerCase()
          .includes(query) ||
        product.category?.name
          ?.toLowerCase()
          .includes(query)
    );

  /* =========================================================
     ADD TO CART
  ========================================================= */

  async function handleAddToCart(
    product: CatalogProduct
  ) {
    const token =
      localStorage.getItem(
        "access_token"
      );

    if (!token) {
      setNotice(
        "Please log in to add items to your cart."
      );

      return;
    }

    try {
      const response =
        await api.cart.addItem(
          {
            product_id:
              product.id,

            quantity: 1,
          },
          token
        );

      if (!response.ok) {
        const data =
          await response
            .json()
            .catch(
              () => null
            );

        throw new Error(
          data?.detail ||
            "Failed to add to cart"
        );
      }

      setNotice(
        `✅ Added "${product.name}" to your cart!`
      );

      setTimeout(() => {
        setNotice("");
      }, 3000);
    } catch (err) {
      console.error(
        "Failed to add product to cart:",
        err
      );

      setNotice(
        err instanceof Error
          ? err.message
          : "Something went wrong."
      );
    }
  }

  /* =========================================================
     TOOLBAR
  ========================================================= */

  const toolbar = (
    <StoreToolbar
      search={search}
      onSearchChange={
        setSearch
      }
      category={category}
      onCategoryChange={
        handleCategory
      }
    />
  );

  /* =========================================================
     LOADING
  ========================================================= */

  if (loading) {
    return (
      <div
        className={
          styles.page
        }
      >
        {toolbar}

        <div
          className={
            styles.loading
          }
        >
          <div
            className={
              styles.loadingSpinner
            }
          />

          <span>
            Loading products...
          </span>
        </div>
      </div>
    );
  }

  /* =========================================================
     ERROR
  ========================================================= */

  if (error) {
    return (
      <div
        className={
          styles.page
        }
      >
        {toolbar}

        <div
          className={
            styles.error
          }
        >
          <h2>
            Unable to load products
          </h2>

          <p>
            {error}
          </p>

          <button
            type="button"
            onClick={() =>
              fetchProducts(
                category
              )
            }
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  /* =========================================================
     MAIN
  ========================================================= */

  return (
    <div
      className={
        styles.page
      }
    >
      {toolbar}

      {/* NOTICE */}

      {notice && (
        <p
          className={
            styles.notice
          }
          role="status"
        >
          {notice}
        </p>
      )}

      {/* =====================================================
          ACTIVE FILTER
      ===================================================== */}

      {category && (
        <div
          className={
            styles.activeFilter
          }
        >
          <span>
            Showing products in
            <strong>
              {" "}
              {category}
            </strong>
          </span>

          <button
            type="button"
            onClick={() =>
              handleCategory(null)
            }
          >
            Clear filter
          </button>
        </div>
      )}

      {/* =====================================================
          PRODUCTS
      ===================================================== */}

      {filtered.length > 0 ? (
        <div
          className={
            styles.grid
          }
        >
          {filtered.map(
            (product) => (
              <StoreCard
                key={
                  product.id
                }
                product={
                  product
                }
                onCartClick={
                  handleAddToCart
                }
              />
            )
          )}
        </div>
      ) : (
        <div
          className={
            styles.empty
          }
        >
          <h3>
            No products found
          </h3>

          <p>
            {search
              ? `No products match "${search}".`
              : category
              ? "There are no products in this category yet."
              : "There are currently no products available."}
          </p>

          {category && (
            <button
              type="button"
              onClick={() =>
                handleCategory(
                  null
                )
              }
            >
              View all products
            </button>
          )}
        </div>
      )}
    </div>
  );
}