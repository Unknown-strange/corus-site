"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Trash2 } from "lucide-react";
import styles from "./Cart.module.css";
import CartItem, {
  CartItemType,
} from "./CartItem";
import api from "@/lib/api";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

// API response types
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
  category?: string; // "rentals" or "store"
};

export default function Cart({ category = "store" }: Props) {
  const [cartItems, setCartItems] = useState<CartItemType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  // Format category name for display
  const categoryDisplay = category.charAt(0).toUpperCase() + category.slice(1);

  // Fetch cart from API
  const fetchCart = async () => {
    try {
      const token = localStorage.getItem("access_token");
      if (!token) {
        setError("Please log in to view your cart.");
        setLoading(false);
        return;
      }

      const response = await fetch(`${API_BASE}/cart`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        if (response.status === 401) {
          setError("Session expired. Please log in again.");
          setLoading(false);
          return;
        }
        throw new Error("Failed to fetch cart");
      }

      const data: ApiCartResponse = await response.json();

      // Map API response to CartItemType
      const mappedItems: CartItemType[] = data.items.map((item) => ({
        id: parseInt(item.product_id) || 0,
        productId: item.product_id,
        name: item.product_name,
        description: "", // API doesn't provide description yet
        price: parseFloat(item.unit_price_ghs) || 0,
        image: item.image_url || "/images/placeholder.png",
        quantity: item.quantity,
        selected: true,
        stock: item.stock,
        slug: item.product_slug,
        lineTotal: parseFloat(item.line_total_ghs) || 0,
      }));

      // TODO: Filter by category when API supports it
      // For now, show all items (you can add filtering later)
      setCartItems(mappedItems);
      setError(null);
    } catch (err) {
      setError("Failed to load cart items.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Add/update item quantity
  const updateQuantity = async (productId: string, quantity: number) => {
    try {
      const token = localStorage.getItem("access_token");
      if (!token) return;

      const response = await fetch(`${API_BASE}/cart/items/${productId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ quantity }),
      });

      if (!response.ok) throw new Error("Failed to update quantity");

      await fetchCart();
    } catch (err) {
      console.error(err);
      setError("Failed to update quantity.");
    }
  };

  // Delete item from cart
  const deleteItem = async (productId: string) => {
    try {
      const token = localStorage.getItem("access_token");
      if (!token) return;

      const response = await fetch(`${API_BASE}/cart/items/${productId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) throw new Error("Failed to delete item");

      await fetchCart();
    } catch (err) {
      console.error(err);
      setError("Failed to delete item.");
    }
  };

  // Load cart on mount
  useEffect(() => {
    fetchCart();
  }, []);

  // Handlers for child components
  const increase = (id: number) => {
    const item = cartItems.find((i) => i.id === id);
    if (item) {
      updateQuantity(item.productId, item.quantity + 1);
    }
  };

  const decrease = (id: number) => {
    const item = cartItems.find((i) => i.id === id);
    if (item && item.quantity > 1) {
      updateQuantity(item.productId, item.quantity - 1);
    }
  };

  const toggleSelected = (id: number) => {
    setCartItems((items) =>
      items.map((item) =>
        item.id === id ? { ...item, selected: !item.selected } : item
      )
    );
  };

  const handleDelete = (id: number) => {
    const item = cartItems.find((i) => i.id === id);
    if (item) {
      deleteItem(item.productId);
    }
  };

  const selectAll = () => {
    const allSelected = cartItems.every((item) => item.selected);
    setCartItems((items) =>
      items.map((item) => ({
        ...item,
        selected: !allSelected,
      }))
    );
  };

  const totalItems = cartItems.reduce((sum, item) => sum + item.quantity, 0);

    // ─── Checkout handler ──────────────────────────────────────────
  const handleCheckout = () => {
    router.push("/checkout");
  };

  if (loading) {
    return (
      <section className={styles.cartContainer}>
        <div className={styles.loading}>Loading your cart...</div>
      </section>
    );
  }

  if (error) {
    return (
      <section className={styles.cartContainer}>
        <div className={styles.error}>{error}</div>
      </section>
    );
  }

  if (cartItems.length === 0) {
    return (
      <section className={styles.cartContainer}>
        <div className={styles.header}>{categoryDisplay} (0)</div>
        <div className={styles.emptyCart}>Your {categoryDisplay.toLowerCase()} cart is empty.</div>
      </section>
    );
  }

  return (
    <section className={styles.cartContainer}>
      <div className={styles.header}>
        {categoryDisplay} ({totalItems})
      </div>

      {/* Select All */}
      <label className={styles.selectAll}>
        <input
          type="checkbox"
          checked={cartItems.every((i) => i.selected)}
          onChange={selectAll}
        />
        Select all items
      </label>

      {/* Items */}
      <div className={styles.cartList}>
        {cartItems.map((item) => (
          <CartItem
            key={item.id}
            item={item}
            onIncrease={increase}
            onDecrease={decrease}
            onDelete={handleDelete}
            onToggle={toggleSelected}
          />
        ))}
      </div>

      {/* Footer */}
      <div className={styles.footer}>
          <button className={styles.checkout} onClick={handleCheckout}>
    Checkout
  </button>
      </div>
    </section>
  );
}