"use client";

import {
  useEffect,
  useState,
} from "react";
import Image from "next/image";

import {
  Check,
  Minus,
  Plus,
  ShoppingBag,
  Trash2,
  Camera,
} from "lucide-react";

import styles from "./Cart.module.css";

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:8000";

type ApiCartItem = {
  product_id: string;
  product_name: string;
  product_slug: string;
  unit_price_ghs: string;
  quantity: number;
  line_total_ghs: string;
  image_url: string;
  stock: number;
};

type ApiCartResponse = {
  id: string;
  items: ApiCartItem[];
  total_ghs: string;
  item_count: number;
  updated_at: string;
};

type CartItem = {
  productId: string;
  name: string;
  price: number;
  image: string;
  quantity: number;
  stock: number;
  lineTotal: number;
  selected: boolean;
  slug: string;
};

type Props = {
  category?: string;
};

type ApiError = {
  detail?: unknown;
  message?: unknown;
};

function getErrorMessage(
  data: unknown,
  fallback: string
): string {
  if (
    typeof data === "string" &&
    data.trim()
  ) {
    return data;
  }

  if (
    data &&
    typeof data === "object"
  ) {
    const value =
      data as ApiError;

    if (
      typeof value.detail ===
      "string"
    ) {
      return value.detail;
    }

    if (
      Array.isArray(value.detail)
    ) {
      const messages =
        value.detail
          .map((item) => {
            if (
              item &&
              typeof item ===
                "object" &&
              "msg" in item &&
              typeof (
                item as {
                  msg?: unknown;
                }
              ).msg === "string"
            ) {
              return (
                item as {
                  msg: string;
                }
              ).msg;
            }

            return null;
          })
          .filter(
            (
              item
            ): item is string =>
              Boolean(item)
          );

      if (
        messages.length > 0
      ) {
        return messages.join(
          ", "
        );
      }
    }

    if (
      typeof value.message ===
      "string"
    ) {
      return value.message;
    }
  }

  return fallback;
}

export default function Cart({
  category = "store",
}: Props) {
  const [
    items,
    setItems,
  ] = useState<CartItem[]>(
    []
  );

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    error,
    setError,
  ] =
    useState<
      string | null
    >(null);

  const [
    updatingId,
    setUpdatingId,
  ] =
    useState<
      string | null
    >(null);

  const isRentals =
    category === "rentals";

  const categoryDisplay =
    category.charAt(0).toUpperCase() +
    category.slice(1);

  /* =========================================================
     LOAD STORE CART
  ========================================================= */

  const fetchCart =
    async () => {
      try {
        setLoading(true);
        setError(null);

        /*
         * IMPORTANT:
         *
         * /cart is the store/product cart.
         *
         * Rental reservations are not stored there.
         * Therefore the Rentals tab must never call /cart.
         */
        if (isRentals) {
          setItems([]);
          return;
        }

        const token =
          localStorage.getItem(
            "access_token"
          );

        if (!token) {
          setError(
            "Please log in to view your cart."
          );
          return;
        }

        const response =
          await fetch(
            `${API_BASE}/cart`,
            {
              headers: {
                Authorization:
                  `Bearer ${token}`,
              },
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

          return;
        }

        if (
          response.status ===
          403
        ) {
          setError(
            "Customer access is required to use the cart."
          );

          return;
        }

        const raw =
          await response.text();

        let data: unknown =
          null;

        if (raw) {
          try {
            data =
              JSON.parse(raw);
          } catch {
            data = raw;
          }
        }

        if (
          !response.ok
        ) {
          throw new Error(
            getErrorMessage(
              data,
              "Failed to load cart."
            )
          );
        }

        const cart =
          data as ApiCartResponse;

        const mapped: CartItem[] =
          Array.isArray(
            cart.items
          )
            ? cart.items.map(
                (item) => ({
                  productId:
                    item.product_id,

                  name:
                    item.product_name,

                  price:
                    Number.parseFloat(
                      item.unit_price_ghs
                    ) || 0,

                  image:
                    item.image_url ||
                    "/images/placeholder.png",

                  quantity:
                    item.quantity,

                  stock:
                    Number.isFinite(
                      item.stock
                    )
                      ? item.stock
                      : 0,

                  lineTotal:
                    Number.parseFloat(
                      item.line_total_ghs
                    ) || 0,

                  selected:
                    true,

                  slug:
                    item.product_slug,
                })
              )
            : [];

        setItems(
          mapped
        );
      } catch (
        err
      ) {
        console.error(
          "CART LOAD FAILED:",
          err
        );

        setError(
          err instanceof
            Error
            ? err.message
            : "Failed to load cart."
        );
      } finally {
        setLoading(false);
      }
    };

  useEffect(() => {
    fetchCart();
  }, [
    category,
  ]);

  /* =========================================================
     UPDATE QUANTITY
  ========================================================= */

  const updateQuantity =
    async (
      productId: string,
      quantity: number
    ) => {
      if (
        quantity < 1
      ) {
        return;
      }

      try {
        setUpdatingId(
          productId
        );

        setError(null);

        const token =
          localStorage.getItem(
            "access_token"
          );

        if (!token) {
          setError(
            "Please log in to update your cart."
          );

          return;
        }

        const response =
          await fetch(
            `${API_BASE}/cart/items/${productId}`,
            {
              method:
                "PATCH",

              headers: {
                "Content-Type":
                  "application/json",

                Authorization:
                  `Bearer ${token}`,
              },

              body:
                JSON.stringify({
                  quantity,
                }),
            }
          );

        const raw =
          await response.text();

        let data: unknown =
          null;

        if (raw) {
          try {
            data =
              JSON.parse(raw);
          } catch {
            data = raw;
          }
        }

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

        if (
          !response.ok
        ) {
          throw new Error(
            getErrorMessage(
              data,
              "Failed to update quantity."
            )
          );
        }

        await fetchCart();
      } catch (
        err
      ) {
        console.error(
          "CART UPDATE FAILED:",
          err
        );

        setError(
          err instanceof
            Error
            ? err.message
            : "Failed to update quantity."
        );
      } finally {
        setUpdatingId(
          null
        );
      }
    };

  /* =========================================================
     DELETE ITEM
  ========================================================= */

  const deleteItem =
    async (
      productId: string
    ) => {
      try {
        setUpdatingId(
          productId
        );

        setError(null);

        const token =
          localStorage.getItem(
            "access_token"
          );

        if (!token) {
          setError(
            "Please log in to update your cart."
          );

          return;
        }

        const response =
          await fetch(
            `${API_BASE}/cart/items/${productId}`,
            {
              method:
                "DELETE",

              headers: {
                Authorization:
                  `Bearer ${token}`,
              },
            }
          );

        const raw =
          await response.text();

        let data: unknown =
          null;

        if (raw) {
          try {
            data =
              JSON.parse(raw);
          } catch {
            data = raw;
          }
        }

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

        if (
          !response.ok
        ) {
          throw new Error(
            getErrorMessage(
              data,
              "Failed to remove item."
            )
          );
        }

        await fetchCart();
      } catch (
        err
      ) {
        console.error(
          "CART DELETE FAILED:",
          err
        );

        setError(
          err instanceof
            Error
            ? err.message
            : "Failed to remove item."
        );
      } finally {
        setUpdatingId(
          null
        );
      }
    };

  /* =========================================================
     SELECTION
  ========================================================= */

  const toggleSelected =
    (
      productId: string
    ) => {
      setItems(
        (current) =>
          current.map(
            (item) =>
              item.productId ===
              productId
                ? {
                    ...item,
                    selected:
                      !item.selected,
                  }
                : item
          )
      );
    };

  const allSelected =
    items.length > 0 &&
    items.every(
      (item) =>
        item.selected
    );

  const selectAll =
    () => {
      setItems(
        (current) =>
          current.map(
            (item) => ({
              ...item,
              selected:
                !allSelected,
            })
          )
      );
    };

  const selectedItems =
    items.filter(
      (item) =>
        item.selected
    );

  const selectedCount =
    selectedItems.reduce(
      (
        total,
        item
      ) =>
        total +
        item.quantity,
      0
    );

  const selectedTotal =
    selectedItems.reduce(
      (
        total,
        item
      ) =>
        total +
        item.lineTotal,
      0
    );

  const totalItems =
    items.reduce(
      (
        total,
        item
      ) =>
        total +
        item.quantity,
      0
    );

  /* =========================================================
     CHECKOUT
  ========================================================= */

  const handleCheckout =
    () => {
      if (
        selectedCount <=
        0
      ) {
        setError(
          "Please select at least one item before checkout."
        );

        return;
      }

      /*
       * Explicitly mark this as a store checkout so stale
       * booking/rental contexts cannot take over /checkout.
       */
      sessionStorage.removeItem(
        "booking_checkout"
      );

      sessionStorage.removeItem(
        "rental_checkout"
      );

      sessionStorage.removeItem(
        "store_checkout_selection"
      );

      sessionStorage.setItem(
        "corus_checkout_intent",
        "store"
      );

      /*
       * Keep selected items available to the checkout page.
       *
       * IMPORTANT:
       * The current backend /orders/checkout endpoint checks
       * the customer's backend cart. It does not yet accept
       * selected product IDs. Therefore this preserves the
       * frontend selection state without falsely claiming that
       * it changes the server-side order.
       */
      sessionStorage.setItem(
        "store_checkout_selection",
        JSON.stringify(
          selectedItems.map(
            (item) => ({
              product_id:
                item.productId,
              quantity:
                item.quantity,
            })
          )
        )
      );

      window.location.href =
        "/checkout";
    };

  /* =========================================================
     FORMAT
  ========================================================= */

  const formatMoney =
    (
      value: number
    ) =>
      `GH₵${value.toLocaleString(
        "en-GH",
        {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        }
      )}`;

  /* =========================================================
     RENTAL EMPTY/INFORMATION STATE
  ========================================================= */

  if (
    isRentals
  ) {
    return (
      <section
        className={
          styles.cartSection
        }
      >
        <div
          className={
            styles.cartShell
          }
        >
          <header
            className={
              styles.header
            }
          >
            <div>
              <span
                className={
                  styles.badge
                }
              >
                Rentals
              </span>

              <h1>
                Your Rentals
              </h1>

              <p>
                Rental checkout is handled
                directly from each rental.
              </p>
            </div>

            <div
              className={
                styles.count
              }
            >
              <Camera
                size={20}
              />
            </div>
          </header>

          <div
            className={
              styles.messageCard
            }
          >
            <div
              className={
                styles.emptyIcon
              }
            >
              <Camera
                size={28}
              />
            </div>

            <span
              className={
                styles.messageLabel
              }
            >
              Rental Checkout
            </span>

            <h2>
              No rental cart items
            </h2>

            <p>
              Choose a rental, select
              your pickup and drop-off
              dates, then continue to
              checkout from the rental
              details page.
            </p>

            <a
              href="/rentals"
              className={
                styles.browseButton
              }
            >
              Browse Rentals
            </a>
          </div>
        </div>
      </section>
    );
  }

  /* =========================================================
     LOADING
  ========================================================= */

  if (
    loading
  ) {
    return (
      <section
        className={
          styles.cartSection
        }
      >
        <div
          className={
            styles.loadingCard
          }
        >
          <div
            className={
              styles.spinner
            }
          />

          <p>
            Loading your cart...
          </p>
        </div>
      </section>
    );
  }

  /* =========================================================
     ERROR
  ========================================================= */

  if (
    error &&
    items.length ===
      0
  ) {
    return (
      <section
        className={
          styles.cartSection
        }
      >
        <div
          className={
            styles.messageCard
          }
        >
          <div
            className={
              styles.messageIcon
            }
          >
            !
          </div>

          <h2>
            Unable to load your cart
          </h2>

          <p>
            {error}
          </p>

          <button
            type="button"
            className={
              styles.retryButton
            }
            onClick={
              fetchCart
            }
          >
            Try Again
          </button>
        </div>
      </section>
    );
  }

  /* =========================================================
     EMPTY STORE
  ========================================================= */

  if (
    items.length ===
    0
  ) {
    return (
      <section
        className={
          styles.cartSection
        }
      >
        <div
          className={
            styles.messageCard
          }
        >
          <div
            className={
              styles.emptyIcon
            }
          >
            <ShoppingBag
              size={30}
            />
          </div>

          <span
            className={
              styles.messageLabel
            }
          >
            Store
          </span>

          <h2>
            Your cart is empty
          </h2>

          <p>
            Add something from the
            store to get started.
          </p>

          <a
            href="/store"
            className={
              styles.browseButton
            }
          >
            Browse Store
          </a>
        </div>
      </section>
    );
  }

  /* =========================================================
     STORE CART
  ========================================================= */

  return (
    <section
      className={
        styles.cartSection
      }
    >
      <div
        className={
          styles.cartShell
        }
      >
        {/* HEADER */}

        <header
          className={
            styles.header
          }
        >
          <div>
            <span
              className={
                styles.badge
              }
            >
              Store
            </span>

            <h1>
              Your Cart
            </h1>

            <p>
              {totalItems}{" "}
              {totalItems ===
              1
                ? "item"
                : "items"}{" "}
              in your cart
            </p>
          </div>

          <div
            className={
              styles.count
            }
          >
            {totalItems}
          </div>
        </header>

        {/* SELECT ALL */}

        <div
          className={
            styles.selectionBar
          }
        >
          <button
            type="button"
            className={`${styles.selectAllButton} ${
              allSelected
                ? styles.selectAllActive
                : ""
            }`}
            onClick={
              selectAll
            }
            aria-pressed={
              allSelected
            }
          >
            <span
              className={
                styles.checkbox
              }
            >
              {allSelected && (
                <Check
                  size={13}
                  strokeWidth={3}
                />
              )}
            </span>

            Select all items
          </button>

          <span
            className={
              styles.selectedLabel
            }
          >
            {selectedCount}{" "}
            selected
          </span>
        </div>

        {/* ERROR */}

        {error && (
          <div
            className={
              styles.inlineError
            }
          >
            {error}
          </div>
        )}

        {/* ITEMS */}

        <div
          className={
            styles.items
          }
        >
          {items.map(
            (item) => {
              const updating =
                updatingId ===
                item.productId;

              return (
                <article
                  key={
                    item.productId
                  }
                  className={`${styles.item} ${
                    item.selected
                      ? styles.itemSelected
                      : ""
                  } ${
                    updating
                      ? styles.itemLoading
                      : ""
                  }`}
                >
                  <button
                    type="button"
                    className={`${styles.itemCheck} ${
                      item.selected
                        ? styles.itemCheckActive
                        : ""
                    }`}
                    onClick={() =>
                      toggleSelected(
                        item.productId
                      )
                    }
                    aria-label={`${
                      item.selected
                        ? "Deselect"
                        : "Select"
                    } ${item.name}`}
                  >
                    {item.selected && (
                      <Check
                        size={13}
                        strokeWidth={3}
                      />
                    )}
                  </button>

                  <div
                    className={
                      styles.productImage
                    }
                  >
                    <Image
                      src={
                        item.image
                      }
                      alt={
                        item.name
                      }
                      fill
                      sizes="(max-width: 600px) 84px, 112px"
                      className={
                        styles.image
                      }
                    />
                  </div>

                  <div
                    className={
                      styles.productInfo
                    }
                  >
                    <span
                      className={
                        styles.productType
                      }
                    >
                      Store Product
                    </span>

                    <h2>
                      {item.name}
                    </h2>

                    <p>
                      {formatMoney(
                        item.price
                      )}{" "}
                      each
                    </p>

                    <div
                      className={
                        styles.productBottom
                      }
                    >
                      <div
                        className={
                          styles.quantity
                        }
                      >
                        <button
                          type="button"
                          onClick={() =>
                            updateQuantity(
                              item.productId,
                              item.quantity -
                                1
                            )
                          }
                          disabled={
                            updating ||
                            item.quantity <=
                              1
                          }
                          aria-label="Decrease quantity"
                        >
                          <Minus
                            size={14}
                          />
                        </button>

                        <span>
                          {
                            item.quantity
                          }
                        </span>

                        <button
                          type="button"
                          onClick={() =>
                            updateQuantity(
                              item.productId,
                              item.quantity +
                                1
                            )
                          }
                          disabled={
                            updating ||
                            (item.stock >
                              0 &&
                              item.quantity >=
                                item.stock)
                          }
                          aria-label="Increase quantity"
                        >
                          <Plus
                            size={14}
                          />
                        </button>
                      </div>

                      <strong
                        className={
                          styles.mobileLineTotal
                        }
                      >
                        {formatMoney(
                          item.lineTotal
                        )}
                      </strong>
                    </div>
                  </div>

                  <div
                    className={
                      styles.desktopTotal
                    }
                  >
                    <span>
                      Total
                    </span>

                    <strong>
                      {formatMoney(
                        item.lineTotal
                      )}
                    </strong>
                  </div>

                  <button
                    type="button"
                    className={
                      styles.deleteButton
                    }
                    onClick={() =>
                      deleteItem(
                        item.productId
                      )
                    }
                    disabled={
                      updating
                    }
                    aria-label={`Remove ${item.name} from cart`}
                  >
                    <Trash2
                      size={18}
                    />
                  </button>

                  {updating && (
                    <div
                      className={
                        styles.itemOverlay
                      }
                    >
                      <div
                        className={
                          styles.spinner
                        }
                      />
                    </div>
                  )}
                </article>
              );
            }
          )}
        </div>

        {/* SUMMARY */}

        <footer
          className={
            styles.summary
          }
        >
          <div
            className={
              styles.summaryContent
            }
          >
            <div>
              <span>
                Selected Items
              </span>

              <strong>
                {selectedCount}
              </strong>
            </div>

            <div>
              <span>
                Cart Total
              </span>

              <strong
                className={
                  styles.total
                }
              >
                {formatMoney(
                  selectedTotal
                )}
              </strong>
            </div>
          </div>

          <button
            type="button"
            className={
              styles.checkoutButton
            }
            disabled={
              selectedCount ===
              0
            }
            onClick={
              handleCheckout
            }
          >
            Proceed to Checkout
          </button>
        </footer>
      </div>
    </section>
  );
}