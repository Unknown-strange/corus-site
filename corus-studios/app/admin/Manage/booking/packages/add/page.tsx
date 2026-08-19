"use client";

import {
  useState,
} from "react";

import {
  useRouter,
} from "next/navigation";

import {
  ArrowLeft,
  PackagePlus,
  Save,
} from "lucide-react";

import NavbarAdmin from "@/components/NavbarAdmin";
import Footer from "@/components/Footer";

import styles from "./page.module.css";

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:8000";

const slugify = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

export default function AddPackagePage() {
  const router = useRouter();

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

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState<string | null>(null);

  const goBack = () => {
    router.push(
      "/admin/Manage/booking/packages"
    );
  };

  const handleSubmit = async (
    event: React.FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    setLoading(true);
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
          `${API_BASE}/admin/session-types`,
          {
            method: "POST",
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

              is_active: true,
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
            "Failed to create package."
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
          : "Failed to create package."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <NavbarAdmin />

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
                Add Package
              </h1>

              <p
                className={
                  styles.subtitle
                }
              >
                Create a new photography
                package customers can book.
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
                <PackagePlus
                  size={21}
                />
              </div>

              <div>
                <h2>
                  Package Details
                </h2>

                <p>
                  Enter the details customers
                  will see during booking.
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
              onSubmit={
                handleSubmit
              }
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
                    const value =
                      event.target
                        .value;

                    setName(value);
                    setSlug(
                      slugify(value)
                    );
                  }}
                  className={
                    styles.input
                  }
                  placeholder="e.g. Birthday Photoshoot"
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
                  placeholder="birthday-photoshoot"
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
                    className={
                      styles.label
                    }
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
                      placeholder="500"
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
                    className={
                      styles.label
                    }
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
                      onChange={(
                        event
                      ) =>
                        setDuration(
                          event.target
                            .value
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
                    {description.length}/300
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
                  placeholder="Describe what is included in this package..."
                  required
                />
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
                    loading
                  }
                >
                  <Save size={17} />

                  {loading
                    ? "Saving..."
                    : "Save Package"}
                </button>
              </div>
            </form>
          </section>
        </div>
      </main>

      <Footer />
    </>
  );
}