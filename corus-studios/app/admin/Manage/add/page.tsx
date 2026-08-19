"use client";

import {
  useEffect,
  useRef,
  useState,
  Suspense,
} from "react";

import {
  useSearchParams,
  useRouter,
} from "next/navigation";

import Image from "next/image";

import {
  Upload,
  ArrowLeft,
  Save,
  Camera,
  ShoppingBag,
} from "lucide-react";

import NavbarAdmin from "@/components/NavbarAdmin";
import Footer from "@/components/Footer";

import styles from "./page.module.css";

type Category = {
  id: string;
  name: string;
  slug: string;
  description: string;
  sort_order: number;
  is_active: boolean;
};

type UploadedImage = {
  url: string;
  file_id: string;
};

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:8000";

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function AddGadgetContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const type =
    searchParams.get("type") ||
    "rental";

  const isRental =
    type === "rental";

  const fileInputRef =
    useRef<HTMLInputElement>(null);

  const [name, setName] =
    useState("");

  const [description, setDescription] =
    useState("");

  const [price, setPrice] =
    useState("");

  const [stock, setStock] =
    useState("1");

  const [
    lowStockThreshold,
    setLowStockThreshold,
  ] = useState("1");

  const [categoryId, setCategoryId] =
    useState("");

  const [categories, setCategories] =
    useState<Category[]>([]);

  const [
    loadingCategories,
    setLoadingCategories,
  ] = useState(false);

  const [
    categoryError,
    setCategoryError,
  ] = useState<string | null>(null);

  const [
    preview,
    setPreview,
  ] = useState<string | null>(null);

  const [
    imageFile,
    setImageFile,
  ] = useState<File | null>(null);

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState<string | null>(null);

  const Icon = isRental
    ? Camera
    : ShoppingBag;

  /* =========================================================
     BACK
  ========================================================= */

  const goBack = () => {
    router.push(
      `/admin/Manage/${
        isRental
          ? "rentals"
          : "store"
      }`
    );
  };

  /* =========================================================
     LOAD STORE CATEGORIES
  ========================================================= */

  useEffect(() => {
    if (isRental) {
      return;
    }

    let cancelled = false;

    const loadCategories =
      async () => {
        setLoadingCategories(true);
        setCategoryError(null);

        try {
          const token =
            localStorage.getItem(
              "access_token"
            );

          if (!token) {
            throw new Error(
              "Your session has expired. Please log in again."
            );
          }

          const response =
            await fetch(
              `${API_BASE}/admin/categories`,
              {
                method: "GET",
                headers: {
                  Authorization:
                    `Bearer ${token}`,
                  Accept:
                    "application/json",
                },
              }
            );

          const responseData =
            await response
              .json()
              .catch(
                () => null
              );

          if (
            response.status ===
            401
          ) {
            localStorage.removeItem(
              "access_token"
            );

            localStorage.removeItem(
              "user"
            );

            window.location.href =
              "/login";

            return;
          }

          if (!response.ok) {
            const message =
              responseData?.detail ||
              responseData?.message ||
              "Failed to load product categories.";

            throw new Error(
              Array.isArray(message)
                ? message
                    .map(
                      (
                        item: {
                          msg?: string;
                        }
                      ) =>
                        item.msg ||
                        "Validation error"
                    )
                    .join(
                      ", "
                    )
                : message
            );
          }

          if (
            !Array.isArray(
              responseData
            )
          ) {
            throw new Error(
              "The categories response was not in the expected format."
            );
          }

          const activeCategories =
            responseData
              .filter(
                (item: Category) =>
                  item.is_active
              )
              .sort(
                (
                  a: Category,
                  b: Category
                ) =>
                  a.sort_order -
                  b.sort_order
              );

          if (cancelled) {
            return;
          }

          setCategories(
            activeCategories
          );
        } catch (err) {
          console.error(
            "Failed to load categories:",
            err
          );

          if (!cancelled) {
            setCategories([]);

            setCategoryError(
              err instanceof Error
                ? err.message
                : "Failed to load categories."
            );
          }
        } finally {
          if (!cancelled) {
            setLoadingCategories(
              false
            );
          }
        }
      };

    loadCategories();

    return () => {
      cancelled = true;
    };
  }, [isRental]);

  /* =========================================================
     IMAGE SELECTION
  ========================================================= */

  const handleImage = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file =
      event.target.files?.[0];

    if (!file) {
      return;
    }

    if (
      !file.type.startsWith(
        "image/"
      )
    ) {
      setError(
        "Please select a valid image."
      );

      event.target.value = "";

      return;
    }

    setError(null);

    setImageFile(file);

    const reader =
      new FileReader();

    reader.onload = () => {
      setPreview(
        reader.result as string
      );
    };

    reader.readAsDataURL(file);
  };

  /* =========================================================
     IMAGE UPLOAD
     
     IMPORTANT:
     This uses the SAME upload request as the existing
     working store-product flow.

     We do not send "rental_equipment" here.
  ========================================================= */

  const uploadImage = async (
    file: File
  ): Promise<UploadedImage> => {
    const token =
      localStorage.getItem(
        "access_token"
      );

    if (!token) {
      throw new Error(
        "Your session has expired. Please log in again."
      );
    }

    const formData =
      new FormData();

    formData.append(
      "file",
      file
    );

    /*
     * Keep the same purpose that is already known
     * to work for your existing store flow.
     */
    formData.append(
      "purpose",
      "product"
    );

    const response =
      await fetch(
        `${API_BASE}/admin/uploads`,
        {
          method: "POST",
          headers: {
            Authorization:
              `Bearer ${token}`,
          },
          body: formData,
        }
      );

    if (
      response.status ===
      401
    ) {
      localStorage.removeItem(
        "access_token"
      );

      localStorage.removeItem(
        "user"
      );

      window.location.href =
        "/login";

      throw new Error(
        "Session expired."
      );
    }

    const responseData =
      await response
        .json()
        .catch(
          () => null
        );

    if (!response.ok) {
      console.error(
        "IMAGE UPLOAD FAILED",
        {
          status:
            response.status,
          statusText:
            response.statusText,
          response:
            responseData,
        }
      );

      let message =
        "Image upload failed.";

      if (
        Array.isArray(
          responseData?.detail
        )
      ) {
        message =
          responseData.detail
            .map(
              (
                item: {
                  msg?: string;
                }
              ) =>
                item.msg ||
                "Validation error"
            )
            .join(
              ", "
            );
      } else if (
        typeof responseData?.detail ===
        "string"
      ) {
        message =
          responseData.detail;
      } else if (
        responseData?.error
          ?.message
      ) {
        message =
          responseData.error.message;
      } else if (
        responseData?.message
      ) {
        message =
          responseData.message;
      }

      throw new Error(
        message
      );
    }

    if (
      !responseData?.url ||
      !responseData?.file_id
    ) {
      console.error(
        "INVALID IMAGE UPLOAD RESPONSE",
        responseData
      );

      throw new Error(
        "Image upload succeeded but no image information was returned."
      );
    }

    return {
      url:
        responseData.url,
      file_id:
        responseData.file_id,
    };
  };

  /* =========================================================
     SUBMIT
  ========================================================= */

  const handleSubmit = async (
    event: React.FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    setError(null);

    /* -------------------------------------------------------
       VALIDATION
    ------------------------------------------------------- */

    if (
      !name.trim() ||
      !description.trim() ||
      !price
    ) {
      setError(
        "Please complete all required fields."
      );

      return;
    }

    if (
      !isRental &&
      !categoryId
    ) {
      setError(
        "Please select a product category."
      );

      return;
    }

    if (
      !isRental &&
      categories.length === 0
    ) {
      setError(
        "No active product categories are available. Please create a category first."
      );

      return;
    }

    const numericPrice =
      Number(price);

    const numericStock =
      Number(stock);

    const numericLowStock =
      Number(
        lowStockThreshold
      );

    if (
      Number.isNaN(
        numericPrice
      ) ||
      numericPrice < 0
    ) {
      setError(
        isRental
          ? "Please enter a valid rental rate."
          : "Please enter a valid product price."
      );

      return;
    }

    if (
      Number.isNaN(
        numericStock
      ) ||
      numericStock < 0
    ) {
      setError(
        "Please enter a valid stock quantity."
      );

      return;
    }

    if (
      Number.isNaN(
        numericLowStock
      ) ||
      numericLowStock < 0
    ) {
      setError(
        "Please enter a valid low-stock threshold."
      );

      return;
    }

    if (!imageFile) {
      setError(
        "Please select an image."
      );

      return;
    }

    setLoading(true);

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

      /* =====================================================
         UPLOAD IMAGE
      ===================================================== */

      const uploaded =
        await uploadImage(
          imageFile
        );

      const imageUrl =
        uploaded.url;

      const imagekitFileId =
        uploaded.file_id;

      const slug =
        slugify(name);

      /* =====================================================
         RENTAL
      ===================================================== */

      if (isRental) {
        const response =
          await fetch(
            `${API_BASE}/admin/rent-equipment`,
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
                  name.trim(),

                slug,

                description:
                  description.trim(),

                daily_rate_ghs:
                  numericPrice,

                stock:
                  numericStock,

                low_stock_threshold:
                  numericLowStock,

                image_url:
                  imageUrl,

                imagekit_file_id:
                  imagekitFileId,

                is_active:
                  true,
              }),
            }
          );

        const responseData =
          await response
            .json()
            .catch(
              () => null
            );

        if (
          response.status ===
          401
        ) {
          localStorage.removeItem(
            "access_token"
          );

          localStorage.removeItem(
            "user"
          );

          window.location.href =
            "/login";

          return;
        }

        if (!response.ok) {
          console.error(
            "CREATE RENTAL FAILED",
            {
              status:
                response.status,
              response:
                responseData,
            }
          );

          let message =
            "Failed to create rental equipment.";

          if (
            Array.isArray(
              responseData?.detail
            )
          ) {
            message =
              responseData.detail
                .map(
                  (
                    item: {
                      msg?: string;
                    }
                  ) =>
                    item.msg ||
                    "Validation error"
                )
                .join(
                  ", "
                );
          } else if (
            typeof responseData?.detail ===
            "string"
          ) {
            message =
              responseData.detail;
          } else if (
            responseData?.message
          ) {
            message =
              responseData.message;
          }

          throw new Error(
            message
          );
        }
      }

      /* =====================================================
         STORE PRODUCT
      ===================================================== */

      else {
        const response =
          await fetch(
            `${API_BASE}/admin/products`,
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
                  name.trim(),

                slug,

                description:
                  description.trim(),

                price:
                  numericPrice,

                stock:
                  numericStock,

                low_stock_threshold:
                  numericLowStock,

                category_id:
                  categoryId,

                image_url:
                  imageUrl,

                imagekit_file_id:
                  imagekitFileId,

                is_active:
                  true,
              }),
            }
          );

        const responseData =
          await response
            .json()
            .catch(
              () => null
            );

        if (
          response.status ===
          401
        ) {
          localStorage.removeItem(
            "access_token"
          );

          localStorage.removeItem(
            "user"
          );

          window.location.href =
            "/login";

          return;
        }

        if (!response.ok) {
          console.error(
            "CREATE PRODUCT FAILED",
            {
              status:
                response.status,
              response:
                responseData,
            }
          );

          let message =
            "Failed to create product.";

          if (
            Array.isArray(
              responseData?.detail
            )
          ) {
            message =
              responseData.detail
                .map(
                  (
                    item: {
                      msg?: string;
                    }
                  ) =>
                    item.msg ||
                    "Validation error"
                )
                .join(
                  ", "
                );
          } else if (
            typeof responseData?.detail ===
            "string"
          ) {
            message =
              responseData.detail;
          } else if (
            responseData?.message
          ) {
            message =
              responseData.message;
          }

          throw new Error(
            message
          );
        }
      }

      /* =====================================================
         GO BACK
      ===================================================== */

      router.push(
        `/admin/Manage/${
          isRental
            ? "rentals"
            : "store"
        }`
      );

      router.refresh();
    } catch (err) {
      console.error(
        "ADD ITEM FAILED:",
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <main
      className={
        styles.page
      }
    >
      <div
        className={
          styles.container
        }
      >
        {/* ===================================================
            PAGE HEADER
        =================================================== */}

        <section
          className={
            styles.pageHeader
          }
        >
          <button
            type="button"
            className={
              styles.backButton
            }
            onClick={
              goBack
            }
            aria-label="Go back"
          >
            <ArrowLeft
              size={19}
            />
          </button>

          <div>
            <span
              className={
                styles.eyebrow
              }
            >
              {isRental
                ? "Rental Management"
                : "Store Management"}
            </span>

            <h1
              className={
                styles.heading
              }
            >
              Add{" "}
              {isRental
                ? "rental equipment"
                : "product"}
            </h1>

            <p
              className={
                styles.subtitle
              }
            >
              Add a new item to your{" "}
              {isRental
                ? "rental inventory"
                : "store"}.
            </p>
          </div>
        </section>

        {/* ===================================================
            FORM CARD
        =================================================== */}

        <section
          className={
            styles.formCard
          }
        >
          <div
            className={
              styles.cardHeader
            }
          >
            <div
              className={
                styles.cardIcon
              }
            >
              <Icon size={21} />
            </div>

            <div>
              <h2>
                {isRental
                  ? "Rental Details"
                  : "Product Details"}
              </h2>

              <p>
                Add the information
                customers will see.
              </p>
            </div>
          </div>

          {error && (
            <div
              className={
                styles.error
              }
            >
              {error}
            </div>
          )}

          <form
            className={
              styles.form
            }
            onSubmit={
              handleSubmit
            }
          >
            {/* NAME */}

            <div
              className={
                styles.fieldGroup
              }
            >
              <label
                htmlFor="name"
                className={
                  styles.label
                }
              >
                Name
              </label>

              <input
                id="name"
                type="text"
                value={name}
                onChange={(
                  event
                ) =>
                  setName(
                    event.target
                      .value
                  )
                }
                className={
                  styles.input
                }
                placeholder={
                  isRental
                    ? "Name of rental equipment"
                    : "Name of product"
                }
                required
              />
            </div>

            {/* DESCRIPTION */}

            <div
              className={
                styles.fieldGroup
              }
            >
              <div
                className={
                  styles.labelRow
                }
              >
                <label
                  htmlFor="description"
                  className={
                    styles.label
                  }
                >
                  Description
                </label>

                <span
                  className={
                    styles.counter
                  }
                >
                  {description.length}
                  /300
                </span>
              </div>

              <textarea
                id="description"
                value={
                  description
                }
                onChange={(
                  event
                ) =>
                  setDescription(
                    event.target
                      .value
                  )
                }
                maxLength={300}
                className={
                  styles.textarea
                }
                placeholder="Describe the item..."
                required
              />
            </div>

            {/* PRICE + CATEGORY / STOCK */}

            <div
              className={
                styles.twoColumn
              }
            >
              {/* PRICE */}

              <div
                className={
                  styles.fieldGroup
                }
              >
                <label
                  htmlFor="price"
                  className={
                    styles.label
                  }
                >
                  {isRental
                    ? "Daily Rental Rate"
                    : "Price"}
                </label>

                <div
                  className={
                    styles.priceWrapper
                  }
                >
                  <span
                    className={
                      styles.currency
                    }
                  >
                    GH₵
                  </span>

                  <input
                    id="price"
                    type="number"
                    min="0"
                    step="0.01"
                    value={
                      price
                    }
                    onChange={(
                      event
                    ) =>
                      setPrice(
                        event.target
                          .value
                      )
                    }
                    className={
                      styles.priceInput
                    }
                    placeholder="0.00"
                    required
                  />
                </div>
              </div>

              {/* CATEGORY / STOCK */}

              {!isRental ? (
                <div
                  className={
                    styles.fieldGroup
                  }
                >
                  <label
                    htmlFor="category"
                    className={
                      styles.label
                    }
                  >
                    Category
                  </label>

                  <select
                    id="category"
                    value={
                      categoryId
                    }
                    onChange={(
                      event
                    ) =>
                      setCategoryId(
                        event.target
                          .value
                      )
                    }
                    className={
                      styles.input
                    }
                    disabled={
                      loadingCategories
                    }
                    required
                  >
                    <option
                      value=""
                    >
                      {loadingCategories
                        ? "Loading categories..."
                        : categories.length ===
                          0
                        ? "No categories available"
                        : "Select category"}
                    </option>

                    {categories.map(
                      (
                        category
                      ) => (
                        <option
                          key={
                            category.id
                          }
                          value={
                            category.id
                          }
                        >
                          {
                            category.name
                          }
                        </option>
                      )
                    )}
                  </select>

                  {categoryError && (
                    <span
                      className={
                        styles.fieldError
                      }
                    >
                      {
                        categoryError
                      }
                    </span>
                  )}
                </div>
              ) : (
                <div
                  className={
                    styles.fieldGroup
                  }
                >
                  <label
                    htmlFor="stock"
                    className={
                      styles.label
                    }
                  >
                    Stock
                  </label>

                  <input
                    id="stock"
                    type="number"
                    min="0"
                    value={
                      stock
                    }
                    onChange={(
                      event
                    ) =>
                      setStock(
                        event.target
                          .value
                      )
                    }
                    className={
                      styles.input
                    }
                    required
                  />
                </div>
              )}
            </div>

            {/* STORE STOCK + LOW STOCK */}

            {!isRental && (
              <div
                className={
                  styles.twoColumn
                }
              >
                <div
                  className={
                    styles.fieldGroup
                  }
                >
                  <label
                    htmlFor="storeStock"
                    className={
                      styles.label
                    }
                  >
                    Stock
                  </label>

                  <input
                    id="storeStock"
                    type="number"
                    min="0"
                    value={
                      stock
                    }
                    onChange={(
                      event
                    ) =>
                      setStock(
                        event.target
                          .value
                      )
                    }
                    className={
                      styles.input
                    }
                    required
                  />
                </div>

                <div
                  className={
                    styles.fieldGroup
                  }
                >
                  <label
                    htmlFor="lowStock"
                    className={
                      styles.label
                    }
                  >
                    Low Stock Threshold
                  </label>

                  <input
                    id="lowStock"
                    type="number"
                    min="0"
                    value={
                      lowStockThreshold
                    }
                    onChange={(
                      event
                    ) =>
                      setLowStockThreshold(
                        event.target
                          .value
                      )
                    }
                    className={
                      styles.input
                    }
                    required
                  />
                </div>
              </div>
            )}

            {/* RENTAL LOW STOCK */}

            {isRental && (
              <div
                className={
                  styles.fieldGroup
                }
              >
                <label
                  htmlFor="rentalLowStock"
                  className={
                    styles.label
                  }
                >
                  Low Stock Threshold
                </label>

                <input
                  id="rentalLowStock"
                  type="number"
                  min="0"
                  value={
                    lowStockThreshold
                  }
                  onChange={(
                    event
                  ) =>
                    setLowStockThreshold(
                      event.target
                        .value
                    )
                  }
                  className={
                    styles.input
                  }
                  required
                />
              </div>
            )}

            {/* IMAGE */}

            <div
              className={
                styles.fieldGroup
              }
            >
              <span
                className={
                  styles.label
                }
              >
                Product Image
              </span>

              <button
                type="button"
                className={
                  styles.upload
                }
                onClick={() =>
                  fileInputRef.current?.click()
                }
                aria-label="Select product image"
              >
                {preview ? (
                  <Image
                    src={preview}
                    alt="Selected preview"
                    fill
                    sizes="(max-width: 700px) 100vw, 800px"
                    className={
                      styles.preview
                    }
                  />
                ) : (
                  <div
                    className={
                      styles.placeholder
                    }
                  >
                    <div
                      className={
                        styles.uploadIcon
                      }
                    >
                      <Upload
                        size={24}
                      />
                    </div>

                    <strong>
                      Select an image
                    </strong>

                    <span>
                      JPG, PNG or WebP
                    </span>
                  </div>
                )}

                <input
                  ref={
                    fileInputRef
                  }
                  type="file"
                  hidden
                  accept="image/jpeg,image/png,image/webp"
                  onChange={
                    handleImage
                  }
                />
              </button>
            </div>

            {/* ACTIONS */}

            <div
              className={
                styles.formActions
              }
            >
              <button
                type="button"
                className={
                  styles.cancelButton
                }
                onClick={
                  goBack
                }
                disabled={
                  loading
                }
              >
                Cancel
              </button>

              <button
                type="submit"
                className={
                  styles.saveButton
                }
                disabled={
                  loading ||
                  (!isRental &&
                    loadingCategories)
                }
              >
                <Save
                  size={17}
                />

                {loading
                  ? "Saving..."
                  : isRental
                    ? "Save Rental"
                    : "Save Product"}
              </button>
            </div>
          </form>
        </section>
      </div>
    </main>
  );
}

export default function AddGadgetPage() {
  return (
    <>
      <NavbarAdmin />

      <Suspense
        fallback={
          <main
            className={
              styles.page
            }
          >
            <div
              className={
                styles.loading
              }
            >
              Loading...
            </div>
          </main>
        }
      >
        <AddGadgetContent />
      </Suspense>

      <Footer />
    </>
  );
}

export const dynamic =
  "force-dynamic";