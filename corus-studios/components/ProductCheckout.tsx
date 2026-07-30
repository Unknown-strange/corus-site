"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { useState } from "react";
import StoreToolbar from "./StoreToolbar";
import { formatGhs, type Product } from "@/lib/store-products";
import styles from "./ProductCheckout.module.css";

export default function ProductCheckout({ product }: { product: Product | null }) {
  const [quantity, setQuantity] = useState(1);
  const [notice, setNotice] = useState("");

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

  /**
   * NOT WIRED TO THE API — needs auth and the client first. The *shape* of the
   * flow is settled though (team decision, 2026-07-29): every purchase goes
   * through the cart. There is no single-product purchase endpoint.
   *
   * When wiring this up, Checkout is two calls, in order:
   *
   *   POST /cart/items { product_id, quantity }  → add this product
   *   POST /orders/checkout                      → converts the WHOLE cart and
   *                                                returns authorization_url
   *
   * Two consequences worth surfacing in the UI at that point:
   *
   *   - checkout takes the entire cart, not just this product, so a customer
   *     with other items queued will pay for all of them here;
   *   - stock is reduced at checkout and the order is voided after
   *     ORDER_PAYMENT_MINUTES (15) if payment does not complete.
   */
  function handleCheckout() {
    setNotice(
      "Not connected yet — checkout adds this item to the cart, then converts the whole cart (POST /cart/items → /orders/checkout). Needs sign-in."
    );
  }

  function handleAddToCart() {
    setNotice("The cart isn't connected yet — adding items needs sign-in and the API client.");
  }

  return (
    <div className={styles.page}>
      <StoreToolbar onCartClick={handleAddToCart} />

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
              src={product.image_url}
              alt={product.name}
              fill
              sizes="(max-width: 52rem) 100vw, 50vw"
              className={styles.image}
              priority
            />
          </div>

          <div className={styles.facts}>
            <p className={styles.price}>{formatGhs(product.price)}</p>

            <p className={styles.fact}>
              Description:{" "}
              <span className={styles.factValue}>
                {product.description
                  ? `${product.condition ? `${product.condition} ` : ""}${product.name} ${product.description}`
                  : "None"}
              </span>
            </p>

            <p className={styles.fact}>Disclaimer:</p>

            <p className={styles.stockNote}>
              {product.stock > 0 ? `${product.stock} in stock` : "Out of stock"}
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
                disabled={quantity >= product.stock}
                onClick={() => setQuantity((q) => Math.min(product.stock, q + 1))}
              >
                +
              </button>
            </div>

            <button type="button" className={styles.secondary} onClick={handleAddToCart}>
              Add to Cart
            </button>

            <button type="button" className={styles.primary} onClick={handleCheckout}>
              Checkout
            </button>
          </div>

          {notice ? (
            <p className={styles.notice} role="status">
              {notice}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
