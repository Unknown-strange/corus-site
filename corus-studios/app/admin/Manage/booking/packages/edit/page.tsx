"use client";

import {
  useEffect,
  useState,
  Suspense,
} from "react";

import {
  useSearchParams,
  useRouter,
} from "next/navigation";

import {
  ArrowLeft,
  Package,
  Save,
} from "lucide-react";

import NavbarAdmin from "@/components/NavbarAdmin";
import Footer from "@/components/Footer";

import styles from "./page.module.css";

type SessionType = {
  id: string;
  name: string;
  slug: string;
  description: string;
  price_ghs: string;
  duration_minutes: number;
  is_active: boolean;
};

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:8000";

const slugify = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

function EditPackageContent() {
  const router = useRouter();

  const searchParams =
    useSearchParams();

  const id =
    searchParams.get("id") || "";

  const [name, setName] =
    useState("");

  const [slug, setSlug] =
    useState("");

  const [price, setPrice] =
    useState("");

  const [duration, setDuration] =
    useState("60");

  const [description, setDescription] =
    useState("");

  const [isActive, setIsActive] =
    useState(true);

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [error, setError] =
    useState<string | null>(null);

  const goBack = () => {
    router.push(
      "/admin/Manage/booking/packages"
    );
  };

  useEffect(() => {
    const loadPackage = async () => {
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

        const response =
          await fetch(
            `${API_BASE}/admin/session-types`,
            {
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

          localStorage.removeItem(
            "user"
          );

          window.location.href =
            "/login";

          return;
        }

        if (!response.ok) {
          throw new Error(
            "Failed to load packages."
          );
        }

        const data =
          await response.json();

        const found =
          Array.isArray(data)
            ? data.find(
                (item: SessionType) =>
                  item.id === id
              )
            : null;

        if (!found) {
          throw new Error(
            "Package not found."
          );
        }

        setName(found.name);
        setSlug(found.slug);
        setPrice(
          found.price_ghs
        );
        setDuration(
          String(
            found.duration_minutes
          )
        );
        setDescription(
          found.description || ""
        );
        setIsActive(
          found.is_active
        );
      } catch (err) {
        console.error(err);

        setError(
          err instanceof Error
            ? err.message
            : "Failed to load package."
        );
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      loadPackage();
    }
  }, [id]);

  const handleSubmit = async (
    event: React.FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    setSaving(true);
    setError(null);

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
          `${API_BASE}/admin/session-types/${id}`,
          {
            method: "PATCH",
            headers: {
              Authorization:
                `Bearer ${token}`,
              "Content-Type":
                "application/json",
            },
            body: JSON.stringify({
              name:
                name.trim(),
              slug:
                slug.trim() ||
                slugify(name),
              description:
                description.trim(),
              price_ghs:
                Number(price),
              duration_minutes:
                Number(duration),
              is_active:
                isActive,
            }),
          }
        );

      if (response.status === 401) {
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
        const body =
          await response
            .json()
            .catch(() => null);

        throw new Error(
          body?.detail ||
            "Failed to update package."
        );
      }

      router.push(
        "/admin/Manage/booking/packages"
      );
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : "Failed to save package."
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <main className={styles.page}>
        <div
          className={
            styles.loading
          }
        >
          Loading package...
        </div>
      </main>
    );
  }

  return (
    <main className={styles.page}>
      <div
        className={
          styles.container
        }
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
          >
            <ArrowLeft size={20} />
          </button>

          <div>
            <span
              className={
                styles.eyebrow
              }
            >
              Booking Management
            </span>

            <h1
              className={
                styles.heading
              }
            >
              Edit Package
            </h1>

            <p
              className={
                styles.subtitle
              }
            >
              Update the package details
              customers see during booking.
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
              <Package size={21} />
            </div>

            <div>
              <h2>
                Package Details
              </h2>

              <p>
                Update pricing, duration
                and description.
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
                Package Name
              </label>

              <input
                id="name"
                type="text"
                value={name}
                onChange={(event) => {
                  setName(
                    event.target.value
                  );

                  if (!slug) {
                    setSlug(
                      slugify(
                        event.target.value
                      )
                    );
                  }
                }}
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
                htmlFor="slug"
                className={styles.label}
              >
                Slug
              </label>

              <input
                id="slug"
                type="text"
                value={slug}
                onChange={(event) =>
                  setSlug(
                    event.target.value
                      .toLowerCase()
                      .replace(
                        /\s+/g,
                        "-"
                      )
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
                  Price
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

              <div
                className={
                  styles.fieldGroup
                }
              >
                <label
                  htmlFor="duration"
                  className={styles.label}
                >
                  Duration
                </label>

                <div
                  className={
                    styles.inputWithSuffix
                  }
                >
                  <input
                    id="duration"
                    type="number"
                    min="1"
                    value={duration}
                    onChange={(event) =>
                      setDuration(
                        event.target.value
                      )
                    }
                    className={
                      styles.input
                    }
                    required
                  />

                  <span>
                    minutes
                  </span>
                </div>
              </div>
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
                  {description.length}
                  /300
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
                styles.availabilityGroup
              }
            >
              <button
                type="button"
                className={`${styles.availabilityButton} ${
                  isActive
                    ? styles.activeAvailable
                    : ""
                }`}
                onClick={() =>
                  setIsActive(true)
                }
              >
                Active
              </button>

              <button
                type="button"
                className={`${styles.availabilityButton} ${
                  !isActive
                    ? styles.activeUnavailable
                    : ""
                }`}
                onClick={() =>
                  setIsActive(false)
                }
              >
                Inactive
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

export default function EditPackagePage() {
  return (
    <>
      <NavbarAdmin />

      <Suspense
        fallback={
          <main
            className={styles.page}
          >
            <div
              className={
                styles.loading
              }
            >
              Loading package...
            </div>
          </main>
        }
      >
        <EditPackageContent />
      </Suspense>

      <Footer />
    </>
  );
}

export const dynamic =
  "force-dynamic";