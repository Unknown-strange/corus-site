"use client";

import {
  useEffect,
  useState,
} from "react";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { Search, SlidersHorizontal } from "lucide-react";

import api from "@/lib/api";

import styles from "./StoreToolbar.module.css";

export type StoreCategory = {
  id: string;
  name: string;
  slug: string;
  description?: string;
  sort_order?: number;
  is_active?: boolean;
};

type Props = {
  search?: string;
  onSearchChange?: (
    value: string
  ) => void;

  category?: string | null;

  onCategoryChange?: (
    value: string | null
  ) => void;
};

export default function StoreToolbar({
  search = "",
  onSearchChange,
  category = null,
  onCategoryChange,
}: Props) {
  const router = useRouter();

  const [categories, setCategories] =
    useState<StoreCategory[]>([]);

  const [loadingCategories, setLoadingCategories] =
    useState(true);

  const [categoryError, setCategoryError] =
    useState(false);

  /* =========================================================
     LOAD REAL CATEGORIES
  ========================================================= */

  useEffect(() => {
    let mounted = true;

    const loadCategories = async () => {
      try {
        setLoadingCategories(true);
        setCategoryError(false);

        const response =
          await api.catalog.categories();

        if (!response.ok) {
          throw new Error(
            "Failed to load categories"
          );
        }

        const data =
          await response.json();

        if (!mounted) {
          return;
        }

        const activeCategories =
          (Array.isArray(data)
            ? data
            : []
          )
            .filter(
              (item: StoreCategory) =>
                item.is_active !== false
            )
            .sort(
              (
                a: StoreCategory,
                b: StoreCategory
              ) =>
                (a.sort_order ?? 0) -
                (b.sort_order ?? 0)
            )
            .slice(0, 4);

        setCategories(
          activeCategories
        );
      } catch (error) {
        console.error(
          "Failed to load store categories:",
          error
        );

        if (mounted) {
          setCategories([]);
          setCategoryError(true);
        }
      } finally {
        if (mounted) {
          setLoadingCategories(
            false
          );
        }
      }
    };

    loadCategories();

    return () => {
      mounted = false;
    };
  }, []);

  /* =========================================================
     SEARCH
  ========================================================= */

  const handleSearchChange = (
    value: string
  ) => {
    onSearchChange?.(value);
  };

  /* =========================================================
     CATEGORY
  ========================================================= */

  const handleCategory = (
    slug: string
  ) => {
    const nextValue =
      category === slug
        ? null
        : slug;

    if (onCategoryChange) {
      onCategoryChange(
        nextValue
      );
      return;
    }

    /*
     * Fallback when the parent does not
     * provide onCategoryChange.
     */
    const params =
      new URLSearchParams(
        window.location.search
      );

    if (nextValue) {
      params.set(
        "category",
        nextValue
      );
    } else {
      params.delete(
        "category"
      );
    }

    const query =
      params.toString();

    router.push(
      query
        ? `/store?${query}`
        : "/store"
    );
  };

  /* =========================================================
     CLEAR CATEGORY
  ========================================================= */

  const clearCategory = () => {
    if (onCategoryChange) {
      onCategoryChange(null);
      return;
    }

    const params =
      new URLSearchParams(
        window.location.search
      );

    params.delete(
      "category"
    );

    const query =
      params.toString();

    router.push(
      query
        ? `/store?${query}`
        : "/store"
    );
  };

  /* =========================================================
     CART
  ========================================================= */

  const handleCartClick = () => {
    router.push("/cart");
  };

  return (
    <section
      className={
        styles.band
      }
    >
      <div
        className={
          styles.inner
        }
      >
        {/* =================================================
            HEADING
        ================================================= */}

        <div
          className={
            styles.headingArea
          }
        >

          <h1
            className={
              styles.heading
            }
          >
            Buy a Gadget Today
          </h1>

          <p
            className={
              styles.subheading
            }
          >
            Browse our products and
            find the equipment you need.
          </p>
        </div>

        {/* =================================================
            TOOLBAR
        ================================================= */}

        <div
          className={
            styles.bar
          }
        >
          {/* SEARCH */}

          <div
            className={
              styles.searchWrap
            }
          >
            <Search
              className={
                styles.searchIcon
              }
              size={19}
              aria-hidden="true"
            />

            <input
              className={
                styles.search
              }
              type="search"
              placeholder="Search products..."
              aria-label="Search products"
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
                className={
                  styles.clearSearch
                }
                onClick={() =>
                  handleSearchChange(
                    ""
                  )
                }
                aria-label="Clear search"
              >
                ×
              </button>
            )}
          </div>

          {/* FILTERS */}

          <div
            className={
              styles.filters
            }
          >
            <div
              className={
                styles.filterGroup
              }
            >
              <div
                className={
                  styles.filterHeader
                }
              >
                <span
                  className={
                    styles.filterCaption
                  }
                >
                  <SlidersHorizontal
                    size={14}
                  />

                  Filter
                </span>

                {category && (
                  <button
                    type="button"
                    className={
                      styles.clearFilter
                    }
                    onClick={
                      clearCategory
                    }
                  >
                    Clear
                  </button>
                )}
              </div>

              <div
                className={
                  styles.filterButtons
                }
              >
                {loadingCategories ? (
                  <>
                    <span
                      className={
                        styles.filterSkeleton
                      }
                    />

                    <span
                      className={
                        styles.filterSkeleton
                      }
                    />

                    <span
                      className={
                        styles.filterSkeleton
                      }
                    />
                  </>
                ) : categories.length >
                  0 ? (
                  categories.map(
                    (item) => {
                      const active =
                        category ===
                        item.slug;

                      return (
                        <button
                          key={
                            item.id
                          }
                          type="button"
                          className={`${styles.filter} ${
                            active
                              ? styles.filterActive
                              : ""
                          }`}
                          aria-pressed={
                            active
                          }
                          onClick={() =>
                            handleCategory(
                              item.slug
                            )
                          }
                        >
                          {item.name}
                        </button>
                      );
                    }
                  )
                ) : (
                  <span
                    className={
                      styles.noCategories
                    }
                  >
                    {categoryError
                      ? "Categories unavailable"
                      : "No categories yet"}
                  </span>
                )}
              </div>
            </div>

            {/* CART */}

            <button
              type="button"
              className={
                styles.cart
              }
              aria-label="Open cart"
              onClick={
                handleCartClick
              }
            >
              <Image
                src="/icons/Cart.png"
                alt=""
                width={26}
                height={26}
                className={
                  styles.cartIcon
                }
              />

              <span
                className={
                  styles.cartLabel
                }
              >
                Cart
              </span>
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}