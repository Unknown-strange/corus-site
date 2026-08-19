"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ShoppingBag } from "lucide-react";

import styles from "./Cart.module.css";
import CartItem, {
  CartItemType,
} from "./CartItem";

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:8000";

// =========================================================
// API TYPES
// =========================================================

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

type Props = {
  category?: string;
};

export default function Cart({
  category = "store",
}: Props) {
  const [cartItems, setCartItems] =
    useState<CartItemType[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState<string | null>(null);

  const [updating, setUpdating] =
    useState<string | null>(null);

  const router = useRouter();

  const categoryDisplay =
    category.charAt(0).toUpperCase() +
    category.slice(1);

  // =========================================================
  // FETCH CART
  // =========================================================

  const fetchCart = async () => {
    try {
      setError(null);

      const token =
        localStorage.getItem(
          "access_token"
        );

      if (!token) {
        setError(
          "Please log in to view your cart."
        );

        setLoading(false);

        return;
      }

      const response = await fetch(
        `${API_BASE}/cart`,
        {
          headers: {
            Authorization:
              `Bearer ${token}`,
          },
        }
      );

      if (
        response.status === 401
      ) {
        setError(
          "Session expired. Please log in again."
        );

        setLoading(false);

        return;
      }

      if (
        response.status === 403
      ) {
        setError(
          "Customer access is required to use the cart."
        );

        setLoading(false);

        return;
      }

      if (!response.ok) {
        throw new Error(
          "Failed to fetch cart."
        );
      }

      const data: ApiCartResponse =
        await response.json();

      const mappedItems: CartItemType[] =
        data.items.map(
          (item, index) => ({
            id:
              Number.isFinite(
                Number(item.product_id)
              )
                ? Number(
                    item.product_id
                  )
                : index + 1,

            productId:
              item.product_id,

            name:
              item.product_name,

            description:
              "",

            price:
              Number.parseFloat(
                item.unit_price_ghs
              ) || 0,

            image:
              item.image_url ||
              "/images/placeholder.png",

            quantity:
              item.quantity,

            selected:
              true,

            stock:
              Number.isFinite(
                item.stock
              )
                ? item.stock
                : 0,

            slug:
              item.product_slug,

            lineTotal:
              Number.isFinite(
                Number(
                  item.line_total_ghs
                )
              )
                ? Number(
                    item.line_total_ghs
                  )
                : 0,
          })
        );

      setCartItems(
        mappedItems
      );

      setError(null);
    } catch (err) {
      console.error(
        "CART LOAD FAILED:",
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : "Failed to load cart items."
      );
    } finally {
      setLoading(false);
    }
  };

  // =========================================================
  // UPDATE QUANTITY
  // =========================================================

  const updateQuantity = async (
    productId: string,
    quantity: number
  ) => {
    if (quantity < 1) {
      return;
    }

    try {
      setUpdating(productId);
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

      const response = await fetch(
        `${API_BASE}/cart/items/${productId}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type":
              "application/json",
            Authorization:
              `Bearer ${token}`,
          },
          body: JSON.stringify({
            quantity,
          }),
        }
      );

      if (
        response.status === 401
      ) {
        setError(
          "Session expired. Please log in again."
        );

        return;
      }

      if (!response.ok) {
        const data =
          await response
            .json()
            .catch(() => null);

        throw new Error(
          data?.detail ||
            data?.message ||
            "Failed to update quantity."
        );
      }

      await fetchCart();
    } catch (err) {
      console.error(
        "CART QUANTITY UPDATE FAILED:",
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : "Failed to update quantity."
      );
    } finally {
      setUpdating(null);
    }
  };

  // =========================================================
  // DELETE ITEM
  // =========================================================

  const deleteItem = async (
    productId: string
  ) => {
    try {
      setUpdating(productId);
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

      const response = await fetch(
        `${API_BASE}/cart/items/${productId}`,
        {
          method: "DELETE",
          headers: {
            Authorization:
              `Bearer ${token}`,
          },
        }
      );

      if (
        response.status === 401
      ) {
        setError(
          "Session expired. Please log in again."
        );

        return;
      }

      if (!response.ok) {
        const data =
          await response
            .json()
            .catch(() => null);

        throw new Error(
          data?.detail ||
            data?.message ||
            "Failed to remove item."
        );
      }

      await fetchCart();
    } catch (err) {
      console.error(
        "DELETE CART ITEM FAILED:",
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : "Failed to remove item."
      );
    } finally {
      setUpdating(null);
    }
  };

  // =========================================================
  // INITIAL LOAD
  // =========================================================

  useEffect(() => {
    fetchCart();
  }, []);

  // =========================================================
  // CHILD HANDLERS
  // =========================================================

  const increase = (
    id: number
  ) => {
    const item =
      cartItems.find(
        (current) =>
          current.id === id
      );

    if (!item) {
      return;
    }

    const stock =
      typeof item.stock ===
      "number"
        ? item.stock
        : Number(item.stock) || 0;

    if (
      stock > 0 &&
      item.quantity >= stock
    ) {
      return;
    }

    updateQuantity(
      item.productId,
      item.quantity + 1
    );
  };

  const decrease = (
    id: number
  ) => {
    const item =
      cartItems.find(
        (current) =>
          current.id === id
      );

    if (!item) {
      return;
    }

    if (
      item.quantity <= 1
    ) {
      return;
    }

    updateQuantity(
      item.productId,
      item.quantity - 1
    );
  };

  const toggleSelected = (
    id: number
  ) => {
    setCartItems(
      (items) =>
        items.map(
          (item) =>
            item.id === id
              ? {
                  ...item,
                  selected:
                    !item.selected,
                }
              : item
        )
    );
  };

  const handleDelete = (
    id: number
  ) => {
    const item =
      cartItems.find(
        (current) =>
          current.id === id
      );

    if (!item) {
      return;
    }

    deleteItem(
      item.productId
    );
  };

  const allSelected =
    cartItems.length > 0 &&
    cartItems.every(
      (item) =>
        item.selected
    );

  const someSelected =
    cartItems.some(
      (item) =>
        item.selected
    );

  const selectAll = () => {
    setCartItems(
      (items) =>
        items.map(
          (item) => ({
            ...item,
            selected:
              !allSelected,
          })
        )
    );
  };

  // =========================================================
  // TOTALS
  // =========================================================

  const selectedItems =
    cartItems.filter(
      (item) =>
        item.selected
    );

  const selectedCount =
    selectedItems.reduce(
      (sum, item) =>
        sum +
        item.quantity,
      0
    );

  const selectedTotal =
    selectedItems.reduce(
      (sum, item) => {
        const lineTotal =
          typeof item.lineTotal ===
          "number"
            ? item.lineTotal
            : Number(
                item.lineTotal
              ) || 0;

        return (
          sum + lineTotal
        );
      },
      0
    );

  const totalItems =
    cartItems.reduce(
      (sum, item) =>
        sum +
        item.quantity,
      0
    );

  // =========================================================
  // CHECKOUT
  // =========================================================

  const handleCheckout =
    () => {
      if (
        selectedItems.length ===
        0
      ) {
        setError(
          "Please select at least one item before checkout."
        );

        return;
      }

      router.push(
        "/checkout"
      );
    };

  // =========================================================
  // LOADING
  // =========================================================

  if (loading) {
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
              styles.loadingSpinner
            }
          />

          <p>
            Loading your cart...
          </p>
        </div>
      </section>
    );
  }

  // =========================================================
  // ERROR
  // =========================================================

  if (
    error &&
    cartItems.length ===
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
            styles.errorCard
          }
        >
          <div
            className={
              styles.errorIcon
            }
          >
            !
          </div>

          <h2>
            Unable to load cart
          </h2>

          <p>
            {error}
          </p>
        </div>
      </section>
    );
  }

  // =========================================================
  // EMPTY
  // =========================================================

  if (
    cartItems.length ===
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
            styles.emptyCard
          }
        >
          <div
            className={
              styles.emptyIcon
            }
          >
            <ShoppingBag
              size={28}
            />
          </div>

          <span
            className={
              styles.emptyEyebrow
            }
          >
            {categoryDisplay}
          </span>

          <h2>
            Your cart is empty
          </h2>

          <p>
            Add something from the{" "}
            {categoryDisplay.toLowerCase()}{" "}
            to get started.
          </p>
        </div>
      </section>
    );
  }

  // =========================================================
  // CART
  // =========================================================

  return (
    <section
      className={
        styles.cartSection
      }
    >
      <div
        className={
          styles.cartContainer
        }
      >
        {/* HEADER */}

        <div
          className={
            styles.topHeader
          }
        >
          <div>
            <span
              className={
                styles.eyebrow
              }
            >
              {categoryDisplay}
            </span>

            <h1
              className={
                styles.heading
              }
            >
              Your Cart
            </h1>

            <p
              className={
                styles.subheading
              }
            >
              {totalItems}{" "}
              {totalItems === 1
                ? "item"
                : "items"}{" "}
              in your cart
            </p>
          </div>

          <div
            className={
              styles.itemCount
            }
          >
            {totalItems}
          </div>
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

        {/* SELECT ALL */}

        <div
          className={
            styles.selectBar
          }
        >
          <label
            className={
              styles.selectAll
            }
          >
            <input
              type="checkbox"
              checked={
                allSelected
              }
              ref={(element) => {
                if (
                  element
                ) {
                  element.indeterminate =
                    !allSelected &&
                    someSelected;
                }
              }}
              onChange={
                selectAll
              }
            />

            <span>
              Select all items
            </span>
          </label>

          <span
            className={
              styles.selectedText
            }
          >
            {selectedCount}{" "}
            selected
          </span>
        </div>

        {/* ITEMS */}

        <div
          className={
            styles.cartList
          }
        >
          {cartItems.map(
            (item) => (
              <div
                key={item.id}
                className={`${styles.itemRow} ${
                  item.selected
                    ? styles.itemSelected
                    : ""
                } ${
                  updating ===
                  item.productId
                    ? styles.itemUpdating
                    : ""
                }`}
              >
                <CartItem
                  item={item}
                  onIncrease={
                    increase
                  }
                  onDecrease={
                    decrease
                  }
                  onDelete={
                    handleDelete
                  }
                  onToggle={
                    toggleSelected
                  }
                />

                {updating ===
                  item.productId && (
                  <div
                    className={
                      styles.itemOverlay
                    }
                  >
                    <div
                      className={
                        styles.loadingSpinner
                      }
                    />
                  </div>
                )}
              </div>
            )
          )}
        </div>

        {/* SUMMARY */}

        <div
          className={
            styles.summary
          }
        >
          <div
            className={
              styles.summaryInfo
            }
          >
            <span
              className={
                styles.summaryLabel
              }
            >
              Selected Items
            </span>

            <span
              className={
                styles.summaryValue
              }
            >
              {selectedCount}
            </span>
          </div>

          <div
            className={
              styles.summaryInfo
            }
          >
            <span
              className={
                styles.summaryLabel
              }
            >
              Cart Total
            </span>

            <strong
              className={
                styles.total
              }
            >
              GH₵
              {selectedTotal.toLocaleString(
                "en-GH",
                {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                }
              )}
            </strong>
          </div>

          <button
            type="button"
            className={
              styles.checkout
            }
            onClick={
              handleCheckout
            }
            disabled={
              selectedItems.length ===
              0
            }
          >
            Proceed to Checkout
          </button>
        </div>
      </div>
    </section>
  );
}