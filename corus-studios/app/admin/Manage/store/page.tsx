"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import Link from "next/link";
import Image from "next/image";

import {
  Edit,
  Plus,
  ShoppingBag,
  CheckCircle2,
  AlertTriangle,
  ArrowLeft,
  RefreshCw,
  Tags,
  Trash2,
  Power,
  X,
  Save,
} from "lucide-react";

import NavbarAdmin from "@/components/NavbarAdmin";
import Footer from "@/components/Footer";

import styles from "./page.module.css";

type StoreProduct = {
  id: string;
  name: string;
  slug: string;
  description: string;
  price: string;
  stock: number;
  low_stock_threshold: number;
  effective_low_stock_threshold: number;
  is_low_stock: boolean;
  image_url: string;
  imagekit_file_id: string | null;
  category_id: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

type Category = {
  id: string;
  name: string;
  slug: string;
  description: string;
  sort_order: number;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
};

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:8000";

/* =========================================================
   HELPERS
========================================================= */

const formatMoney = (value: string) => {
  const amount = Number(value);

  if (Number.isNaN(amount)) {
    return `GH₵${value}`;
  }

  return `GH₵${amount.toLocaleString("en-GH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

const slugify = (value: string) => {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
};

export default function StoreAdmin() {
  /* =========================================================
     PRODUCTS
  ========================================================= */

  const [products, setProducts] =
    useState<StoreProduct[]>([]);

  /* =========================================================
     CATEGORIES
  ========================================================= */

  const [categories, setCategories] =
    useState<Category[]>([]);

  /* =========================================================
     GENERAL STATE
  ========================================================= */

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [error, setError] =
    useState<string | null>(null);

  /* =========================================================
     CATEGORY STATE
  ========================================================= */

  const [categoryLoading, setCategoryLoading] =
    useState(false);

  const [categoryError, setCategoryError] =
    useState<string | null>(null);

  const [categorySuccess, setCategorySuccess] =
    useState<string | null>(null);

  const [categoryName, setCategoryName] =
    useState("");

  const [categoryDescription, setCategoryDescription] =
    useState("");

  /* =========================================================
     EDIT CATEGORY
  ========================================================= */

  const [editingCategory, setEditingCategory] =
    useState<Category | null>(null);

  const [editName, setEditName] =
    useState("");

  const [editDescription, setEditDescription] =
    useState("");

  /* =========================================================
     FETCH PRODUCTS + CATEGORIES
  ========================================================= */

  const fetchStoreData = async (
    refresh = false
  ) => {
    try {
      if (refresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError(null);

      const token =
        localStorage.getItem(
          "access_token"
        );

      if (!token) {
        window.location.href = "/login";
        return;
      }

      const headers = {
        Authorization:
          `Bearer ${token}`,
        Accept:
          "application/json",
      };

      const [
        productsResponse,
        categoriesResponse,
      ] = await Promise.all([
        fetch(
          `${API_BASE}/admin/products`,
          {
            headers,
          }
        ),
        fetch(
          `${API_BASE}/admin/categories`,
          {
            headers,
          }
        ),
      ]);

      if (
        productsResponse.status === 401 ||
        categoriesResponse.status === 401
      ) {
        localStorage.removeItem(
          "access_token"
        );

        localStorage.removeItem("user");

        window.location.href = "/login";

        return;
      }

      if (!productsResponse.ok) {
        const responseData =
          await productsResponse
            .json()
            .catch(() => null);

        throw new Error(
          responseData?.detail ||
            "Failed to load store products."
        );
      }

      if (!categoriesResponse.ok) {
        const responseData =
          await categoriesResponse
            .json()
            .catch(() => null);

        throw new Error(
          responseData?.detail ||
            "Failed to load product categories."
        );
      }

      const productData =
        await productsResponse.json();

      const categoryData =
        await categoriesResponse.json();

      setProducts(
        Array.isArray(productData)
          ? productData
          : []
      );

      setCategories(
        Array.isArray(categoryData)
          ? categoryData
          : []
      );
    } catch (err) {
      console.error(
        "Failed to load store:",
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : "Failed to load store."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchStoreData();
  }, []);

  /* =========================================================
     CATEGORY MAP
  ========================================================= */

  const categoryMap = useMemo(() => {
    const map =
      new Map<string, string>();

    categories.forEach(
      (category) => {
        map.set(
          category.id,
          category.name
        );
      }
    );

    return map;
  }, [categories]);

  /* =========================================================
     COUNTS
  ========================================================= */

  const activeCount =
    products.filter(
      (item) => item.is_active
    ).length;

  const lowStockCount =
    products.filter(
      (item) => item.is_low_stock
    ).length;

  const activeCategories =
    categories
      .filter(
        (category) =>
          category.is_active
      )
      .sort(
        (a, b) =>
          a.sort_order -
          b.sort_order
      );

  const inactiveCategories =
    categories
      .filter(
        (category) =>
          !category.is_active
      )
      .sort(
        (a, b) =>
          a.sort_order -
          b.sort_order
      );

  /* =========================================================
     NEXT CATEGORY ORDER
     Backend still expects sort_order, but the admin
     does not need to manage it manually.
  ========================================================= */

  const nextSortOrder =
    categories.length === 0
      ? 0
      : Math.max(
          ...categories.map(
            (category) =>
              category.sort_order ?? 0
          )
        ) + 1;

  /* =========================================================
     CREATE CATEGORY
  ========================================================= */

  const handleCreateCategory = async (
    event: React.FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    setCategoryError(null);
    setCategorySuccess(null);

    if (!categoryName.trim()) {
      setCategoryError(
        "Category name is required."
      );
      return;
    }

    setCategoryLoading(true);

    try {
      const token =
        localStorage.getItem(
          "access_token"
        );

      if (!token) {
        window.location.href =
          "/login";
        return;
      }

      const slug =
        slugify(categoryName);

      const response =
        await fetch(
          `${API_BASE}/admin/categories`,
          {
            method: "POST",
            headers: {
              Authorization:
                `Bearer ${token}`,
              "Content-Type":
                "application/json",
              Accept:
                "application/json",
            },
            body: JSON.stringify({
              name:
                categoryName.trim(),

              slug,

              description:
                categoryDescription.trim(),

              /*
               * The backend requires sort_order,
               * but the admin doesn't need to enter it.
               */
              sort_order:
                nextSortOrder,

              is_active: true,
            }),
          }
        );

      const responseData =
        await response
          .json()
          .catch(() => null);

      if (response.status === 401) {
        localStorage.removeItem(
          "access_token"
        );

        localStorage.removeItem("user");

        window.location.href =
          "/login";

        return;
      }

      if (!response.ok) {
        let message =
          "Failed to create category.";

        if (responseData?.detail) {
          if (
            Array.isArray(
              responseData.detail
            )
          ) {
            message =
              responseData.detail
                .map(
                  (item: {
                    msg?: string;
                  }) =>
                    item.msg ||
                    "Validation error"
                )
                .join(", ");
          } else if (
            typeof responseData.detail ===
            "string"
          ) {
            message =
              responseData.detail;
          }
        }

        throw new Error(message);
      }

      const createdCategory =
        responseData as Category;

      setCategories(
        (current) =>
          [
            ...current,
            createdCategory,
          ].sort(
            (a, b) =>
              a.sort_order -
              b.sort_order
          )
      );

      setCategoryName("");
      setCategoryDescription("");

      setCategorySuccess(
        `“${createdCategory.name}” was added successfully.`
      );

      setTimeout(() => {
        setCategorySuccess(null);
      }, 3500);
    } catch (err) {
      console.error(
        "Failed to create category:",
        err
      );

      setCategoryError(
        err instanceof Error
          ? err.message
          : "Failed to create category."
      );
    } finally {
      setCategoryLoading(false);
    }
  };

  /* =========================================================
     START EDITING
  ========================================================= */

  const startEditingCategory = (
    category: Category
  ) => {
    setEditingCategory(category);

    setEditName(category.name);

    setEditDescription(
      category.description || ""
    );

    setCategoryError(null);
    setCategorySuccess(null);
  };

  /* =========================================================
     CANCEL EDITING
  ========================================================= */

  const cancelEditingCategory = () => {
    setEditingCategory(null);

    setEditName("");
    setEditDescription("");
  };

  /* =========================================================
     UPDATE CATEGORY
  ========================================================= */

  const handleUpdateCategory =
    async () => {
      if (!editingCategory) {
        return;
      }

      if (!editName.trim()) {
        setCategoryError(
          "Category name is required."
        );
        return;
      }

      setCategoryError(null);
      setCategorySuccess(null);
      setCategoryLoading(true);

      try {
        const token =
          localStorage.getItem(
            "access_token"
          );

        if (!token) {
          window.location.href =
            "/login";
          return;
        }

        const response =
          await fetch(
            `${API_BASE}/admin/categories/${editingCategory.id}`,
            {
              method: "PATCH",
              headers: {
                Authorization:
                  `Bearer ${token}`,
                "Content-Type":
                  "application/json",
                Accept:
                  "application/json",
              },
              body: JSON.stringify({
                name:
                  editName.trim(),

                slug:
                  slugify(editName),

                description:
                  editDescription.trim(),

                /*
                 * Preserve the existing backend
                 * ordering value.
                 */
                sort_order:
                  editingCategory.sort_order,

                is_active:
                  editingCategory.is_active,
              }),
            }
          );

        const responseData =
          await response
            .json()
            .catch(() => null);

        if (response.status === 401) {
          localStorage.removeItem(
            "access_token"
          );

          localStorage.removeItem("user");

          window.location.href =
            "/login";

          return;
        }

        if (!response.ok) {
          let message =
            "Failed to update category.";

          if (responseData?.detail) {
            if (
              Array.isArray(
                responseData.detail
              )
            ) {
              message =
                responseData.detail
                  .map(
                    (item: {
                      msg?: string;
                    }) =>
                      item.msg ||
                      "Validation error"
                  )
                  .join(", ");
            } else if (
              typeof responseData.detail ===
              "string"
            ) {
              message =
                responseData.detail;
            }
          }

          throw new Error(message);
        }

        const updatedCategory =
          responseData as Category;

        setCategories(
          (current) =>
            current
              .map(
                (category) =>
                  category.id ===
                  updatedCategory.id
                    ? updatedCategory
                    : category
              )
              .sort(
                (a, b) =>
                  a.sort_order -
                  b.sort_order
              )
        );

        setCategorySuccess(
          `“${updatedCategory.name}” was updated successfully.`
        );

        cancelEditingCategory();

        setTimeout(() => {
          setCategorySuccess(null);
        }, 3500);
      } catch (err) {
        console.error(
          "Failed to update category:",
          err
        );

        setCategoryError(
          err instanceof Error
            ? err.message
            : "Failed to update category."
        );
      } finally {
        setCategoryLoading(false);
      }
    };

  /* =========================================================
     ACTIVATE / DEACTIVATE
  ========================================================= */

  const handleToggleCategory =
    async (
      category: Category
    ) => {
      setCategoryError(null);
      setCategorySuccess(null);
      setCategoryLoading(true);

      try {
        const token =
          localStorage.getItem(
            "access_token"
          );

        if (!token) {
          window.location.href =
            "/login";
          return;
        }

        const response =
          await fetch(
            `${API_BASE}/admin/categories/${category.id}`,
            {
              method: "PATCH",
              headers: {
                Authorization:
                  `Bearer ${token}`,
                "Content-Type":
                  "application/json",
                Accept:
                  "application/json",
              },
              body: JSON.stringify({
                name:
                  category.name,

                slug:
                  category.slug,

                description:
                  category.description,

                sort_order:
                  category.sort_order,

                is_active:
                  !category.is_active,
              }),
            }
          );

        const responseData =
          await response
            .json()
            .catch(() => null);

        if (response.status === 401) {
          localStorage.removeItem(
            "access_token"
          );

          localStorage.removeItem("user");

          window.location.href =
            "/login";

          return;
        }

        if (!response.ok) {
          throw new Error(
            responseData?.detail ||
              responseData?.message ||
              "Failed to update category status."
          );
        }

        const updatedCategory =
          responseData as Category;

        setCategories(
          (current) =>
            current.map(
              (item) =>
                item.id ===
                updatedCategory.id
                  ? updatedCategory
                  : item
            )
        );

        setCategorySuccess(
          updatedCategory.is_active
            ? `“${updatedCategory.name}” is now active.`
            : `“${updatedCategory.name}” has been deactivated.`
        );

        setTimeout(() => {
          setCategorySuccess(null);
        }, 3000);
      } catch (err) {
        console.error(
          "Failed to toggle category:",
          err
        );

        setCategoryError(
          err instanceof Error
            ? err.message
            : "Failed to update category status."
        );
      } finally {
        setCategoryLoading(false);
      }
    };

  /* =========================================================
     DELETE CATEGORY
  ========================================================= */

  const handleDeleteCategory =
    async (
      category: Category
    ) => {
      const confirmed =
        window.confirm(
          `Are you sure you want to delete “${category.name}”?`
        );

      if (!confirmed) {
        return;
      }

      setCategoryError(null);
      setCategorySuccess(null);
      setCategoryLoading(true);

      try {
        const token =
          localStorage.getItem(
            "access_token"
          );

        if (!token) {
          window.location.href =
            "/login";
          return;
        }

        const response =
          await fetch(
            `${API_BASE}/admin/categories/${category.id}`,
            {
              method: "DELETE",
              headers: {
                Authorization:
                  `Bearer ${token}`,
              },
            }
          );

        if (response.status === 401) {
          localStorage.removeItem(
            "access_token"
          );

          localStorage.removeItem("user");

          window.location.href =
            "/login";

          return;
        }

        if (!response.ok) {
          const responseData =
            await response
              .json()
              .catch(() => null);

          throw new Error(
            responseData?.detail ||
              responseData?.message ||
              "Failed to delete category."
          );
        }

        setCategories(
          (current) =>
            current.filter(
              (item) =>
                item.id !==
                category.id
            )
        );

        if (
          editingCategory?.id ===
          category.id
        ) {
          cancelEditingCategory();
        }

        setCategorySuccess(
          `“${category.name}” was deleted.`
        );

        setTimeout(() => {
          setCategorySuccess(null);
        }, 3000);
      } catch (err) {
        console.error(
          "Failed to delete category:",
          err
        );

        setCategoryError(
          err instanceof Error
            ? err.message
            : "Failed to delete category."
        );
      } finally {
        setCategoryLoading(false);
      }
    };

  return (
    <>
      <NavbarAdmin />

      <main className={styles.page}>
        <div className={styles.container}>

          {/* =================================================
              HERO
          ================================================= */}

          <section className={styles.hero}>
            <div
              className={
                styles.heroContent
              }
            >
              <Link
                href="/admin/Manage"
                className={
                  styles.backButton
                }
                aria-label="Back to Manage"
              >
                <ArrowLeft size={18} />
              </Link>

              <span
                className={styles.eyebrow}
              >
                Store Management
              </span>

              <h1
                className={styles.heading}
              >
                Manage your store
              </h1>

              <p
                className={
                  styles.subtitle
                }
              >
                Control the products,
                pricing, inventory,
                categories and
                availability shown in the
                Corus Studio store.
              </p>
            </div>

            <div
              className={
                styles.heroActions
              }
            >
              <div className={styles.statBox}>
                <div
                  className={
                    styles.statIcon
                  }
                >
                  <ShoppingBag size={20} />
                </div>

                <div>
                  <strong>
                    {products.length}
                  </strong>

                  <span>
                    Products
                  </span>
                </div>
              </div>

              <div
                className={
                  styles.availableBox
                }
              >
                <CheckCircle2 size={16} />

                <span>
                  {activeCount} Active
                </span>
              </div>

              <div
                className={
                  styles.categoryCountBox
                }
              >
                <Tags size={16} />

                <span>
                  {activeCategories.length}{" "}
                  Categories
                </span>
              </div>

              {lowStockCount > 0 && (
                <div
                  className={
                    styles.lowStockBox
                  }
                >
                  <AlertTriangle size={16} />

                  <span>
                    {lowStockCount} Low Stock
                  </span>
                </div>
              )}

              <button
                type="button"
                className={
                  styles.refreshButton
                }
                onClick={() =>
                  fetchStoreData(true)
                }
                disabled={refreshing}
                aria-label="Refresh store"
              >
                <RefreshCw
                  size={16}
                  className={
                    refreshing
                      ? styles.spinning
                      : ""
                  }
                />
              </button>

              <Link
                href="/admin/Manage/add?type=store"
                className={
                  styles.heroButton
                }
              >
                <Plus size={18} />
                Add Product
              </Link>
            </div>
          </section>

          {/* =================================================
              ERROR
          ================================================= */}

          {error && (
            <div className={styles.error}>
              <span>
                {error}
              </span>

              <button
                type="button"
                onClick={() =>
                  fetchStoreData()
                }
              >
                Retry
              </button>
            </div>
          )}

          {/* =================================================
              PRODUCTS
          ================================================= */}

          <section
            className={
              styles.storeCard
            }
          >
            <div
              className={
                styles.cardHeader
              }
            >
              <div>
                <div
                  className={
                    styles.titleRow
                  }
                >
                  <h2>
                    Store Products
                  </h2>

                  <span
                    className={
                      styles.activeBadge
                    }
                  >
                    <CheckCircle2 size={13} />

                    {activeCount} Active
                  </span>
                </div>

                <p>
                  Products currently
                  managed in your store.
                </p>
              </div>

              <span
                className={
                  styles.count
                }
              >
                {products.length}{" "}
                {products.length === 1
                  ? "product"
                  : "products"}
              </span>
            </div>

            {loading ? (
              <div
                className={
                  styles.loadingList
                }
              >
                {Array.from({
                  length: 4,
                }).map((_, index) => (
                  <div
                    key={index}
                    className={
                      styles.skeleton
                    }
                  />
                ))}
              </div>
            ) : products.length === 0 ? (
              <div
                className={styles.empty}
              >
                <div
                  className={
                    styles.emptyIcon
                  }
                >
                  <ShoppingBag size={28} />
                </div>

                <h3>
                  No store products
                </h3>

                <p>
                  Add your first product
                  to start building your
                  store.
                </p>

                <Link
                  href="/admin/Manage/add?type=store"
                  className={
                    styles.addButton
                  }
                >
                  <Plus size={18} />
                  Add Product
                </Link>
              </div>
            ) : (
              <div className={styles.list}>
                {products.map((item) => (
                  <article
                    key={item.id}
                    className={styles.item}
                  >
                    <div
                      className={
                        styles.imageWrapper
                      }
                    >
                      {item.image_url ? (
                        <Image
                          src={item.image_url}
                          alt={item.name}
                          width={100}
                          height={100}
                          className={
                            styles.cardImage
                          }
                        />
                      ) : (
                        <ShoppingBag
                          size={28}
                          className={
                            styles.imagePlaceholder
                          }
                        />
                      )}
                    </div>

                    <div className={styles.info}>
                      <span
                        className={
                          styles.itemLabel
                        }
                      >
                        {categoryMap.get(
                          item.category_id
                        ) ||
                          "Uncategorized"}
                      </span>

                      <h3
                        className={
                          styles.cardTitle
                        }
                      >
                        {item.name}
                      </h3>

                      <p
                        className={
                          styles.description
                        }
                      >
                        {item.description}
                      </p>

                      <div
                        className={
                          styles.stockRow
                        }
                      >
                        <span>
                          Stock:{" "}
                          <strong>
                            {item.stock}
                          </strong>
                        </span>

                        {item.is_low_stock && (
                          <span
                            className={
                              styles.lowStockBadge
                            }
                          >
                            Low Stock
                          </span>
                        )}
                      </div>
                    </div>

                    <div
                      className={
                        styles.priceBox
                      }
                    >
                      <span>
                        Price
                      </span>

                      <strong>
                        {formatMoney(
                          item.price
                        )}
                      </strong>
                    </div>

                    <span
                      className={`${styles.availability} ${
                        item.is_active
                          ? styles.available
                          : styles.unavailable
                      }`}
                    >
                      {item.is_active
                        ? "Active"
                        : "Inactive"}
                    </span>

                    <Link
                      href={`/admin/Manage/edit?id=${encodeURIComponent(
                        item.id
                      )}&type=store`}
                      className={
                        styles.editButton
                      }
                      aria-label={`Edit ${item.name}`}
                    >
                      <Edit size={17} />

                      <span>
                        Edit
                      </span>
                    </Link>
                  </article>
                ))}
              </div>
            )}

            {!loading &&
              products.length > 0 && (
                <Link
                  href="/admin/Manage/add?type=store"
                  className={
                    styles.addButton
                  }
                >
                  <Plus size={18} />
                  Add Product
                </Link>
              )}
          </section>

          {/* =================================================
              CATEGORIES
          ================================================= */}

          <section
            className={
              styles.categoryCard
            }
          >
            {/* HEADER */}

            <div
              className={
                styles.categoryHeader
              }
            >
              <div>
                <div
                  className={
                    styles.titleRow
                  }
                >
                  <div
                    className={
                      styles.categoryTitleIcon
                    }
                  >
                    <Tags size={18} />
                  </div>

                  <h2>
                    Product Categories
                  </h2>

                  <span
                    className={
                      styles.activeBadge
                    }
                  >
                    <CheckCircle2 size={13} />

                    {activeCategories.length}{" "}
                    Active
                  </span>
                </div>

                <p
                  className={
                    styles.categorySubtitle
                  }
                >
                  Manage the categories
                  available in the store.
                </p>
              </div>

              <span
                className={
                  styles.count
                }
              >
                {categories.length}{" "}
                {categories.length === 1
                  ? "category"
                  : "categories"}
              </span>
            </div>

            {/* NOTICES */}

            {categoryError && (
              <div
                className={
                  styles.categoryError
                }
              >
                <span>
                  {categoryError}
                </span>

                <button
                  type="button"
                  onClick={() =>
                    setCategoryError(
                      null
                    )
                  }
                  aria-label="Close error"
                >
                  <X size={16} />
                </button>
              </div>
            )}

            {categorySuccess && (
              <div
                className={
                  styles.categorySuccess
                }
              >
                <CheckCircle2 size={16} />

                <span>
                  {categorySuccess}
                </span>
              </div>
            )}

            {/* ADD CATEGORY */}

            <div
              className={
                styles.categoryAddPanel
              }
            >
              <div
                className={
                  styles.categoryPanelHeader
                }
              >
                <div>
                  <h3>
                    Add Category
                  </h3>

                  <p>
                    Create a category for
                    store products.
                  </p>
                </div>

                <div
                  className={
                    styles.categoryPanelIcon
                  }
                >
                  <Plus size={18} />
                </div>
              </div>

              <form
                className={
                  styles.categoryForm
                }
                onSubmit={
                  handleCreateCategory
                }
              >
                <div
                  className={
                    styles.categoryField
                  }
                >
                  <label htmlFor="category-name">
                    Name
                  </label>

                  <input
                    id="category-name"
                    type="text"
                    value={categoryName}
                    onChange={(event) =>
                      setCategoryName(
                        event.target.value
                      )
                    }
                    placeholder="e.g. Cameras"
                    required
                  />
                </div>

                <div
                  className={
                    styles.categoryField
                  }
                >
                  <label htmlFor="category-description">
                    Description
                  </label>

                  <input
                    id="category-description"
                    type="text"
                    value={
                      categoryDescription
                    }
                    onChange={(event) =>
                      setCategoryDescription(
                        event.target.value
                      )
                    }
                    placeholder="e.g. Camera equipment and bodies"
                  />
                </div>

                <button
                  type="submit"
                  className={
                    styles.categoryAddButton
                  }
                  disabled={
                    categoryLoading
                  }
                >
                  <Plus size={16} />

                  {categoryLoading
                    ? "Adding..."
                    : "Add Category"}
                </button>
              </form>
            </div>

            {/* ACTIVE CATEGORIES */}

            <div
              className={
                styles.categoryListHeader
              }
            >
              <div>
                <h3>
                  Active Categories
                </h3>

                <p>
                  These categories will appear
                  in the Add Product dropdown.
                </p>
              </div>
            </div>

            {activeCategories.length ===
            0 ? (
              <div
                className={
                  styles.categoryEmpty
                }
              >
                <div
                  className={
                    styles.categoryEmptyIcon
                  }
                >
                  <Tags size={24} />
                </div>

                <h3>
                  No active categories
                </h3>

                <p>
                  Create your first category
                  above. It will immediately
                  become available in the Add
                  Product form.
                </p>
              </div>
            ) : (
              <div
                className={
                  styles.categoryList
                }
              >
                {activeCategories.map(
                  (category) => (
                    <article
                      key={
                        category.id
                      }
                      className={
                        styles.categoryItem
                      }
                    >
                      <div
                        className={
                          styles.categoryIcon
                        }
                      >
                        <Tags size={18} />
                      </div>

                      <div
                        className={
                          styles.categoryInfo
                        }
                      >
                        <span
                          className={
                            styles.categoryLabel
                          }
                        >
                          Active Category
                        </span>

                        <h4>
                          {category.name}
                        </h4>

                        <p>
                          {category.description ||
                            "No description"}
                        </p>

                        <span
                          className={
                            styles.categorySlug
                          }
                        >
                          /{category.slug}
                        </span>
                      </div>

                      <div
                        className={
                          styles.categoryActions
                        }
                      >
                        <button
                          type="button"
                          className={
                            styles.categoryEditButton
                          }
                          onClick={() =>
                            startEditingCategory(
                              category
                            )
                          }
                        >
                          <Edit size={15} />
                          Edit
                        </button>

                        <button
                          type="button"
                          className={
                            styles.categoryToggleButton
                          }
                          onClick={() =>
                            handleToggleCategory(
                              category
                            )
                          }
                          disabled={
                            categoryLoading
                          }
                        >
                          <Power size={15} />
                          Deactivate
                        </button>

                        <button
                          type="button"
                          className={
                            styles.categoryDeleteButton
                          }
                          onClick={() =>
                            handleDeleteCategory(
                              category
                            )
                          }
                          disabled={
                            categoryLoading
                          }
                          aria-label={`Delete ${category.name}`}
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </article>
                  )
                )}
              </div>
            )}

            {/* INACTIVE CATEGORIES */}

            {inactiveCategories.length >
              0 && (
              <div
                className={
                  styles.inactiveSection
                }
              >
                <div
                  className={
                    styles.categoryListHeader
                  }
                >
                  <div>
                    <h3>
                      Inactive Categories
                    </h3>

                    <p>
                      Inactive categories don't
                      appear in the Add Product
                      dropdown.
                    </p>
                  </div>
                </div>

                <div
                  className={
                    styles.categoryList
                  }
                >
                  {inactiveCategories.map(
                    (category) => (
                      <article
                        key={
                          category.id
                        }
                        className={`${styles.categoryItem} ${styles.inactiveCategory}`}
                      >
                        <div
                          className={
                            styles.categoryIcon
                          }
                        >
                          <Tags size={18} />
                        </div>

                        <div
                          className={
                            styles.categoryInfo
                          }
                        >
                          <span
                            className={
                              styles.categoryInactiveLabel
                            }
                          >
                            Inactive
                          </span>

                          <h4>
                            {category.name}
                          </h4>

                          <p>
                            {category.description ||
                              "No description"}
                          </p>

                          <span
                            className={
                              styles.categorySlug
                            }
                          >
                            /{category.slug}
                          </span>
                        </div>

                        <div
                          className={
                            styles.categoryActions
                          }
                        >
                          <button
                            type="button"
                            className={
                              styles.categoryEditButton
                            }
                            onClick={() =>
                              startEditingCategory(
                                category
                              )
                            }
                          >
                            <Edit size={15} />
                            Edit
                          </button>

                          <button
                            type="button"
                            className={
                              styles.categoryActivateButton
                            }
                            onClick={() =>
                              handleToggleCategory(
                                category
                              )
                            }
                            disabled={
                              categoryLoading
                            }
                          >
                            <Power size={15} />
                            Activate
                          </button>

                          <button
                            type="button"
                            className={
                              styles.categoryDeleteButton
                            }
                            onClick={() =>
                              handleDeleteCategory(
                                category
                              )
                            }
                            disabled={
                              categoryLoading
                            }
                            aria-label={`Delete ${category.name}`}
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </article>
                    )
                  )}
                </div>
              </div>
            )}
          </section>
        </div>
      </main>

      {/* =====================================================
          EDIT CATEGORY MODAL
      ===================================================== */}

      {editingCategory && (
        <div
          className={
            styles.modalBackdrop
          }
          onMouseDown={(event) => {
            if (
              event.target ===
              event.currentTarget
            ) {
              cancelEditingCategory();
            }
          }}
        >
          <div
            className={
              styles.modal
            }
            role="dialog"
            aria-modal="true"
            aria-labelledby="edit-category-title"
          >
            <div
              className={
                styles.modalHeader
              }
            >
              <div>
                <span
                  className={
                    styles.modalEyebrow
                  }
                >
                  Store Management
                </span>

                <h2
                  id="edit-category-title"
                >
                  Edit Category
                </h2>

                <p>
                  Update how this category
                  appears in your store.
                </p>
              </div>

              <button
                type="button"
                className={
                  styles.modalClose
                }
                onClick={
                  cancelEditingCategory
                }
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>

            <div
              className={
                styles.modalForm
              }
            >
              <div
                className={
                  styles.categoryField
                }
              >
                <label htmlFor="edit-category-name">
                  Name
                </label>

                <input
                  id="edit-category-name"
                  type="text"
                  value={editName}
                  onChange={(event) =>
                    setEditName(
                      event.target.value
                    )
                  }
                  required
                />
              </div>

              <div
                className={
                  styles.categoryField
                }
              >
                <label htmlFor="edit-category-description">
                  Description
                </label>

                <textarea
                  id="edit-category-description"
                  value={
                    editDescription
                  }
                  onChange={(event) =>
                    setEditDescription(
                      event.target.value
                    )
                  }
                  rows={4}
                />
              </div>

              <div
                className={
                  styles.modalActions
                }
              >
                <button
                  type="button"
                  className={
                    styles.cancelButton
                  }
                  onClick={
                    cancelEditingCategory
                  }
                  disabled={
                    categoryLoading
                  }
                >
                  Cancel
                </button>

                <button
                  type="button"
                  className={
                    styles.saveCategoryButton
                  }
                  onClick={
                    handleUpdateCategory
                  }
                  disabled={
                    categoryLoading ||
                    !editName.trim()
                  }
                >
                  <Save size={15} />

                  {categoryLoading
                    ? "Saving..."
                    : "Save Changes"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      <Footer />
    </>
  );
}