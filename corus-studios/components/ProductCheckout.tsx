"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import StoreToolbar from "./StoreToolbar";
import { CatalogProduct } from "@/lib/types";
import api from "@/lib/api";
import styles from "./ProductCheckout.module.css";

type Props = {
  product: CatalogProduct | null;
};

export default function ProductCheckout({ product }: Props) {
  const router = useRouter();
  const [quantity, setQuantity] = useState(1);
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(false);

  // If product not found, show error state
  if (!product) {
    return (
      <div className={styles.page}>
        <StoreToolbar />
        <div className={styles.missing}>
          <h2>That product isn&rsquo;t in the store.</h2>
          <p>
            <Link href="/store" className={styles.missingLink}>
              Back to store
            </Link>
          </p>
        </div>
      </div>
    );
  }

  const available = product.stock > 0;
  const price = parseFloat(product.price);
  const total = price * quantity;

  // ─── Add to Cart ──────────────────────────────────────────────
  const handleAddToCart = async () => {
    const token = localStorage.getItem("access_token");
    if (!token) {
      setNotice("⚠️ Please log in to add items to your cart.");
      return;
    }

    setLoading(true);
    setNotice("");

    try {
      const response = await api.cart.addItem(
        {
          product_id: product.id,
          quantity,
        },
        token
      );

      if (!response.ok) {
        const data = await response.json();
        const msg = data.detail || "Failed to add to cart.";
        throw new Error(msg);
      }

      setNotice(`✅ Added ${quantity} × "${product.name}" to your cart!`);
      // Clear notice after a few seconds
      setTimeout(() => setNotice(""), 3000);
    } catch (err: any) {
      setNotice(`❌ ${err.message || "Something went wrong."}`);
    } finally {
      setLoading(false);
    }
  };

  // ─── Checkout ──────────────────────────────────────────────────
  const handleCheckout = () => {
    router.push("/checkout");
  };

  return (
    <div className={styles.page}>
      <StoreToolbar />

      <div className={styles.body}>
        <Link href="/store" className={styles.back}>
          <ArrowLeft size={18} aria-hidden="true" />
          Back
        </Link>

        <h2 className={styles.title}>{product.name}</h2>
        {product.description ? (
          <p className={styles.subtitle}>({product.description})</p>
        ) : null}

        <div className={styles.overview}>
          <div className={styles.imageWrap}>
            <Image
              src={product.image_url || "/images/placeholder.png"}
              alt={product.name}
              fill
              sizes="(max-width: 52rem) 100vw, 50vw"
              className={styles.image}
              priority
            />
          </div>

          <div className={styles.facts}>
            <p className={styles.price}>GH₵{price.toFixed(2)}</p>

            <p className={styles.fact}>
              Description:{" "}
              <span className={styles.factValue}>
                {product.description || "No description available"}
              </span>
            </p>

            {product.category && (
              <p className={styles.fact}>
                Category:{" "}
                <span className={styles.factValue}>{product.category.name}</span>
              </p>
            )}

            <p className={styles.stockNote}>
              {available ? `${product.stock} in stock` : "Out of stock"}
            </p>
          </div>
        </div>

        <div className={styles.controls}>
          <div className={styles.actions}>
            <div className={styles.stepper}>
              <button
                type="button"
                className={styles.stepperButton}
                aria-label="Decrease quantity"
                disabled={quantity <= 1}
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
              >
                -
              </button>
              <span className={styles.quantity} aria-live="polite">
                {quantity}
              </span>
              <button
                type="button"
                className={styles.stepperButton}
                aria-label="Increase quantity"
                disabled={!available || quantity >= product.stock}
                onClick={() => setQuantity((q) => Math.min(product.stock, q + 1))}
              >
                +
              </button>
            </div>

            <button
              type="button"
              className={styles.secondary}
              onClick={handleAddToCart}
              disabled={loading || !available}
            >
              {loading ? "Adding..." : "Add to Cart"}
            </button>

            <button
              type="button"
              className={styles.primary}
              onClick={handleCheckout}
              disabled={!available}
            >
              Checkout
            </button>
          </div>

          {notice ? (
            <p className={`${styles.notice} ${notice.startsWith("✅") ? styles.success : styles.error}`}>
              {notice}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}