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
  CheckCircle2,
  XCircle,
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

type RentalEquipment = {
  id: string;
  name: string;
  slug: string;
  description: string;
  daily_rate_ghs: string;
  stock: number;
  low_stock_threshold: number;
  effective_low_stock_threshold: number;
  is_low_stock: boolean;
  image_url: string;
  imagekit_file_id: string | null;
  is_active: boolean;
};

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

function EditGadgetContent() {
  const router = useRouter();

  const searchParams =
    useSearchParams();

  const fileInputRef =
    useRef<HTMLInputElement>(null);

  const id =
    searchParams.get("id") || "";

  const type =
    searchParams.get("type") ||
    "rental";

  const isRental =
    type === "rental";

  const [name, setName] =
    useState("");

  const [description, setDescription] =
    useState("");

  const [price, setPrice] =
    useState("");

  const [stock, setStock] =
    useState("0");

  const [lowStockThreshold, setLowStockThreshold] =
    useState("0");

  const [categoryId, setCategoryId] =
    useState("");

  const [categories, setCategories] =
    useState<Category[]>([]);

  const [available, setAvailable] =
    useState(true);

  const [preview, setPreview] =
    useState<string | null>(null);

  const [imageFile, setImageFile] =
    useState<File | null>(null);

  const [existingImageFileId, setExistingImageFileId] =
    useState<string | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [error, setError] =
    useState<string | null>(null);

  const [success, setSuccess] =
    useState(false);

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
     FETCH DATA
  ========================================================= */

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        setError(null);

        const token =
          localStorage.getItem(
            "access_token"
          );

        if (!token) {
          window.location.href =
            "/login";

          return;
        }

        const headers = {
          Authorization:
            `Bearer ${token}`,
        };

        const requests:
          Promise<Response>[] = [
            fetch(
              isRental
                ? `${API_BASE}/admin/rent-equipment/${id}`
                : `${API_BASE}/admin/products/${id}`,
              {
                headers,
              }
            ),
          ];

        if (!isRental) {
          requests.push(
            fetch(
              `${API_BASE}/admin/categories`,
              {
                headers,
              }
            )
          );
        }

        const responses =
          await Promise.all(
            requests
          );

        if (
          responses.some(
            (response) =>
              response.status ===
              401
          )
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

        const itemResponse =
          responses[0];

        if (!itemResponse.ok) {
          throw new Error(
            isRental
              ? "Failed to load rental equipment."
              : "Failed to load product."
          );
        }

        if (!isRental) {
          const categoryResponse =
            responses[1];

          if (
            categoryResponse?.ok
          ) {
            const categoryData =
              await categoryResponse.json();

            setCategories(
              Array.isArray(
                categoryData
              )
                ? categoryData.filter(
                    (
                      item: Category
                    ) =>
                      item.is_active
                  )
                : []
            );
          }
        }

        const data =
          await itemResponse.json();

        if (isRental) {
          const item =
            data as RentalEquipment;

          setName(item.name);
          setDescription(
            item.description || ""
          );
          setPrice(
            item.daily_rate_ghs
          );
          setStock(
            String(item.stock)
          );
          setLowStockThreshold(
            String(
              item.low_stock_threshold
            )
          );
          setAvailable(
            item.is_active
          );
          setPreview(
            item.image_url || null
          );
          setExistingImageFileId(
            item.imagekit_file_id
          );
        } else {
          const item =
            data as StoreProduct;

          setName(item.name);
          setDescription(
            item.description || ""
          );
          setPrice(
            item.price
          );
          setStock(
            String(item.stock)
          );
          setLowStockThreshold(
            String(
              item.low_stock_threshold
            )
          );
          setCategoryId(
            item.category_id
          );
          setAvailable(
            item.is_active
          );
          setPreview(
            item.image_url || null
          );
          setExistingImageFileId(
            item.imagekit_file_id
          );
        }
      } catch (err) {
        console.error(err);

        setError(
          err instanceof Error
            ? err.message
            : "Failed to load item."
        );
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      loadData();
    }
  }, [id, isRental]);

  /* =========================================================
     IMAGE
  ========================================================= */

  const handleImage = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file =
      event.target.files?.[0];

    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError(
        "Please select a valid image."
      );

      return;
    }

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
  ========================================================= */

  const uploadImage =
    async (file: File) => {
      const token =
        localStorage.getItem(
          "access_token"
        );

      if (!token) {
        throw new Error(
          "Your session has expired."
        );
      }

      const formData =
        new FormData();

      formData.append(
        "file",
        file
      );

      formData.append(
        "purpose",
        isRental
          ? "rental_equipment"
          : "product"
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
        throw new Error(
          "Your session has expired."
        );
      }

      if (!response.ok) {
        const body =
          await response
            .json()
            .catch(() => null);

        throw new Error(
          body?.detail ||
            body?.error?.message ||
            "Image upload failed."
        );
      }

      return response.json() as Promise<{
        url: string;
        file_id: string;
      }>;
    };

  /* =========================================================
     SAVE
  ========================================================= */

  const handleSubmit = async (
    event: React.FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    setSaving(true);
    setError(null);
    setSuccess(false);

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

      let imageUrl =
        preview || "";

      let imagekitFileId =
        existingImageFileId;

      if (imageFile) {
        const uploaded =
          await uploadImage(
            imageFile
          );

        imageUrl =
          uploaded.url;

        imagekitFileId =
          uploaded.file_id;
      }

      const payload = {
        name:
          name.trim(),
        slug: slugify(name),
        description:
          description.trim(),
        stock:
          Number(stock),
        low_stock_threshold:
          Number(
            lowStockThreshold
          ),
        image_url:
          imageUrl,
        imagekit_file_id:
          imagekitFileId,
        is_active:
          available,
      };

      if (isRental) {
        const response =
          await fetch(
            `${API_BASE}/admin/rent-equipment/${id}`,
            {
              method: "PATCH",
              headers: {
                Authorization:
                  `Bearer ${token}`,
                "Content-Type":
                  "application/json",
              },
              body: JSON.stringify({
                ...payload,
                daily_rate_ghs:
                  Number(price),
              }),
            }
          );

        if (!response.ok) {
          const body =
            await response
              .json()
              .catch(() => null);

          throw new Error(
            body?.detail ||
              "Failed to update rental equipment."
          );
        }
      } else {
        if (!categoryId) {
          throw new Error(
            "Please select a category."
          );
        }

        const response =
          await fetch(
            `${API_BASE}/admin/products/${id}`,
            {
              method: "PATCH",
              headers: {
                Authorization:
                  `Bearer ${token}`,
                "Content-Type":
                  "application/json",
              },
              body: JSON.stringify({
                ...payload,
                price:
                  Number(price),
                category_id:
                  categoryId,
              }),
            }
          );

        if (!response.ok) {
          const body =
            await response
              .json()
              .catch(() => null);

          throw new Error(
            body?.detail ||
              "Failed to update product."
          );
        }
      }

      setSuccess(true);

      setTimeout(() => {
        goBack();
      }, 700);
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : "Failed to save changes."
      );
    } finally {
      setSaving(false);
    }
  };

  const Icon = isRental
    ? Camera
    : ShoppingBag;

  if (loading) {
    return (
      <main className={styles.page}>
        <div
          className={
            styles.loading
          }
        >
          Loading item...
        </div>
      </main>
    );
  }

  return (
    <main className={styles.page}>
      <div
        className={styles.container}
      >
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
            onClick={goBack}
            aria-label="Go back"
          >
            <ArrowLeft size={19} />
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
              Edit{" "}
              {isRental
                ? "rental"
                : "product"}
            </h1>

            <p
              className={
                styles.subtitle
              }
            >
              Update the details,
              pricing, inventory and
              availability.
            </p>
          </div>
        </section>

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
                Update the information
                shown to customers.
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

          {success && (
            <div
              className={
                styles.success
              }
            >
              Changes saved successfully.
            </div>
          )}

          <form
            className={styles.form}
            onSubmit={handleSubmit}
          >
            <div
              className={
                styles.fieldGroup
              }
            >
              <label
                htmlFor="name"
                className={styles.label}
              >
                Name
              </label>

              <input
                id="name"
                type="text"
                value={name}
                onChange={(event) =>
                  setName(
                    event.target.value
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
              <div
                className={
                  styles.labelRow
                }
              >
                <label
                  htmlFor="description"
                  className={styles.label}
                >
                  Description
                </label>

                <span
                  className={
                    styles.counter
                  }
                >
                  {description.length}/300
                </span>
              </div>

              <textarea
                id="description"
                value={description}
                onChange={(event) =>
                  setDescription(
                    event.target.value
                  )
                }
                maxLength={300}
                className={
                  styles.textarea
                }
                required
              />
            </div>

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
                  htmlFor="price"
                  className={styles.label}
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
                    value={price}
                    onChange={(event) =>
                      setPrice(
                        event.target.value
                      )
                    }
                    className={
                      styles.priceInput
                    }
                    required
                  />
                </div>
              </div>

              {!isRental ? (
                <div
                  className={
                    styles.fieldGroup
                  }
                >
                  <label
                    htmlFor="category"
                    className={styles.label}
                  >
                    Category
                  </label>

                  <select
                    id="category"
                    value={categoryId}
                    onChange={(event) =>
                      setCategoryId(
                        event.target.value
                      )
                    }
                    className={
                      styles.input
                    }
                    required
                  >
                    <option value="">
                      Select category
                    </option>

                    {categories.map(
                      (category) => (
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
                </div>
              ) : (
                <div
                  className={
                    styles.fieldGroup
                  }
                >
                  <label
                    htmlFor="stock"
                    className={styles.label}
                  >
                    Stock
                  </label>

                  <input
                    id="stock"
                    type="number"
                    min="0"
                    value={stock}
                    onChange={(event) =>
                      setStock(
                        event.target.value
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
                    htmlFor="stock"
                    className={styles.label}
                  >
                    Stock
                  </label>

                  <input
                    id="stock"
                    type="number"
                    min="0"
                    value={stock}
                    onChange={(event) =>
                      setStock(
                        event.target.value
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
                    className={styles.label}
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
                    onChange={(event) =>
                      setLowStockThreshold(
                        event.target.value
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

            {isRental && (
              <div
                className={
                  styles.fieldGroup
                }
              >
                <label
                  htmlFor="rentalLowStock"
                  className={styles.label}
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
                  onChange={(event) =>
                    setLowStockThreshold(
                      event.target.value
                    )
                  }
                  className={
                    styles.input
                  }
                  required
                />
              </div>
            )}

            {/* AVAILABILITY */}

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
                Availability
              </span>

              <div
                className={
                  styles.availabilityGroup
                }
              >
                <button
                  type="button"
                  className={`${styles.availabilityButton} ${
                    available
                      ? styles.activeAvailable
                      : ""
                  }`}
                  onClick={() =>
                    setAvailable(true)
                  }
                >
                  <CheckCircle2
                    size={17}
                  />

                  Active
                </button>

                <button
                  type="button"
                  className={`${styles.availabilityButton} ${
                    !available
                      ? styles.activeUnavailable
                      : ""
                  }`}
                  onClick={() =>
                    setAvailable(false)
                  }
                >
                  <XCircle
                    size={17}
                  />

                  Inactive
                </button>
              </div>
            </div>

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
              >
                {preview ? (
                  <Image
                    src={preview}
                    alt="Preview"
                    width={600}
                    height={400}
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
                      Upload an image
                    </strong>

                    <span>
                      JPG, PNG or WebP
                    </span>
                  </div>
                )}

                <input
                  ref={fileInputRef}
                  type="file"
                  hidden
                  accept="image/jpeg,image/png,image/webp"
                  onChange={
                    handleImage
                  }
                />
              </button>
            </div>

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
                onClick={goBack}
                disabled={saving}
              >
                Cancel
              </button>

              <button
                type="submit"
                className={
                  styles.saveButton
                }
                disabled={saving}
              >
                <Save size={17} />

                {saving
                  ? "Saving..."
                  : "Save Changes"}
              </button>
            </div>
          </form>
        </section>
      </div>
    </main>
  );
}

export default function EditGadgetPage() {
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
              Loading item...
            </div>
          </main>
        }
      >
        <EditGadgetContent />
      </Suspense>

      <Footer />
    </>
  );
}

export const dynamic =
  "force-dynamic";