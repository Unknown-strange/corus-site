"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import { CartItem, CartResponse } from "@/lib/types";
import styles from "./Checkout.module.css";

// ─── Placeholder fees (no backend support yet) ──────────────
const PLACEHOLDER_SERVICE_FEE_GHS = 250;
const PLACEHOLDER_DELIVERY_FEE_GHS = 250;

export default function Checkout() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState("");
  const [cart, setCart] = useState<CartResponse | null>(null);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ─── Fetch cart on mount ────────────────────────────────────
  useEffect(() => {
    const fetchCart = async () => {
      const token = localStorage.getItem("access_token");
      if (!token) {
        setError("Please log in to view your cart.");
        setFetching(false);
        return;
      }

      try {
        const res = await api.cart.get(token);
        if (!res.ok) {
          if (res.status === 401) {
            localStorage.removeItem("access_token");
            localStorage.removeItem("user");
            router.push("/login");
            return;
          }
          throw new Error("Failed to fetch cart");
        }
        const data: CartResponse = await res.json();
        setCart(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong.");
      } finally {
        setFetching(false);
      }
    };

    fetchCart();
  }, [router]);

  // ─── Handle payment ─────────────────────────────────────────
  const handlePay = async () => {
    const token = localStorage.getItem("access_token");
    if (!token) {
      setNotice("Please log in to proceed.");
      return;
    }

    setLoading(true);
    setNotice("");
    setError(null);

    try {
      const res = await api.orders.checkout(token);
      const data = await res.json();

      if (!res.ok) {
        let msg = "Checkout failed.";
        if (data.detail) {
          if (Array.isArray(data.detail)) {
            msg = data.detail.map((err: any) => err.msg).join(", ");
          } else {
            msg = data.detail;
          }
        }
        throw new Error(msg);
      }

      // ─── Redirect to Paystack ──────────────────────────────
      if (data.authorization_url) {
        window.location.href = data.authorization_url;
      } else {
        setNotice("✅ Order placed! You will be redirected shortly.");
        setTimeout(() => router.push("/orders"), 2000);
      }
    } catch (err: any) {
      setNotice(err.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  // ─── Loading state ──────────────────────────────────────────
  if (fetching) {
    return (
      <div className={styles.page}>
        <div className={styles.band}>
          <h1 className={styles.heading}>Checkout</h1>
        </div>
        <div className={styles.message}>
          <p>Loading your cart…</p>
        </div>
      </div>
    );
  }

  // ─── Error state ────────────────────────────────────────────
  if (error) {
    return (
      <div className={styles.page}>
        <div className={styles.band}>
          <h1 className={styles.heading}>Checkout</h1>
        </div>
        <div className={styles.message}>
          <p className={styles.messageTitle}>Error</p>
          <p>{error}</p>
          <Link href="/store" className={styles.messageLink}>
            Continue Shopping
          </Link>
        </div>
      </div>
    );
  }

  const items = cart?.items || [];
  const subtotal = items.reduce((sum, item) => sum + item.line_total_ghs, 0);
  const grandTotal = subtotal + PLACEHOLDER_SERVICE_FEE_GHS + PLACEHOLDER_DELIVERY_FEE_GHS;

  if (!cart || items.length === 0) {
    return (
      <div className={styles.page}>
        <div className={styles.band}>
          <h1 className={styles.heading}>Checkout</h1>
        </div>
        <div className={styles.message}>
          <p className={styles.messageTitle}>Your cart is empty.</p>
          <Link href="/store" className={styles.messageLink}>
            Go to Store
          </Link>
        </div>
      </div>
    );
  }

  // ─── Render cart items and summary ─────────────────────────
  return (
    <div className={styles.page}>
      <div className={styles.band}>
        <h1 className={styles.heading}>Checkout</h1>
      </div>

      <div className={styles.body}>
        <div className={styles.thumbs}>
          {items.map((item) => (
            <div key={item.product_id} className={styles.thumb}>
              <Image
                src={item.image_url || "/images/placeholder.png"}
                alt={item.product_name}
                fill
                sizes="168px"
                className={styles.thumbImage}
              />
              {item.quantity > 1 ? (
                <span className={styles.thumbQuantity}>×{item.quantity}</span>
              ) : null}
            </div>
          ))}
        </div>

        <div className={styles.summary}>
          <div className={styles.summaryHead}>
            <h2 className={styles.summaryTitle}>Summary</h2>
            <p className={styles.summaryCurrency}>GH₵</p>
          </div>

          <div className={styles.lines}>
            <p className={styles.line}>
              <span>Sub - Total</span>
              <span>{subtotal.toFixed(2)}</span>
            </p>
            <p className={styles.line}>
              <span>Service Fee</span>
              <span>{PLACEHOLDER_SERVICE_FEE_GHS.toFixed(2)}</span>
            </p>
            <p className={styles.line}>
              <span>Delivery Fee</span>
              <span>{PLACEHOLDER_DELIVERY_FEE_GHS.toFixed(2)}</span>
            </p>
          </div>

          <div className={styles.total}>
            <p className={styles.totalLabel}>Grand Total</p>
            <p className={styles.totalValue}>GH₵{grandTotal.toFixed(2)}</p>
          </div>
        </div>

        <div className={styles.actions}>
          <button
            type="button"
            className={styles.pay}
            onClick={handlePay}
            disabled={loading}
          >
            {loading ? "Processing..." : "Proceed to Payment"}
          </button>
        </div>

        {notice && (
          <p className={`${styles.notice} ${notice.startsWith("✅") ? styles.success : styles.error}`}>
            {notice}
          </p>
        )}
      </div>
    </div>
  );
}