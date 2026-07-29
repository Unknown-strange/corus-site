"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { useState } from "react";
import RentalsToolbar from "./RentalsToolbar";
import type { Gadget } from "@/lib/gadgets";
import styles from "./GadgetDetail.module.css";

export default function GadgetDetail({ gadget }: { gadget: Gadget | null }) {
  const [quantity, setQuantity] = useState(1);
  const [notice, setNotice] = useState("");

  if (!gadget) {
    return (
      <div className={styles.page}>
        <RentalsToolbar />
        <div className={styles.missing}>
          <h2>That gadget isn&rsquo;t in the catalogue.</h2>
          <p>
            <Link href="/rentals" className={styles.missingLink}>
              Back to rentals
            </Link>
          </p>
        </div>
      </div>
    );
  }

  /**
   * NOT WIRED TO THE API — see docs/FRONTEND.md "Open questions".
   *
   * POST /rentals/checkout accepts { equipment_id, start_date, end_date } and
   * charges daily rate × days immediately. Three things on this screen have
   * no counterpart in that contract:
   *
   *   - pickup/dropoff TIMES — the API takes plain dates, no time component;
   *   - QUANTITY — one request rents one unit, there is no quantity field;
   *   - ADD TO CART — /cart is products-only (`POST /cart/items { product_id }`).
   *     Rentals check out directly; there is no rental cart.
   */
  function handleCheckout() {
    setNotice(
      "Not connected yet — rental checkout takes dates only, with no pickup time or quantity."
    );
  }

  function handleAddToCart() {
    setNotice("There's no rental cart — the cart API covers shop products only.");
  }

  return (
    <div className={styles.page}>
      <RentalsToolbar onCartClick={handleAddToCart} />

      <div className={styles.body}>
        <Link href="/rentals" className={styles.back}>
          <ArrowLeft size={18} aria-hidden="true" />
          Back
        </Link>

        <h2 className={styles.title}>{gadget.name}</h2>
        {gadget.description ? (
          <p className={styles.subtitle}>({gadget.description})</p>
        ) : null}

        <div className={styles.overview}>
          <div className={styles.imageWrap}>
            <Image
              src={gadget.image_url}
              alt={gadget.name}
              fill
              sizes="(max-width: 52rem) 100vw, 50vw"
              className={styles.image}
              priority
            />
          </div>

          <div className={styles.facts}>
            <p className={styles.price}>GH₵{gadget.daily_rate_ghs}</p>
            <p className={styles.per}>per day</p>

            <p className={styles.fact}>
              Description:{" "}
              <span className={styles.factValue}>{gadget.description ?? "None"}</span>
            </p>

            <p className={styles.fact}>Disclaimer:</p>
          </div>
        </div>

        <div className={styles.controls}>
          <div className={styles.dates}>
            <input
              className={styles.field}
              type="text"
              name="start_date"
              placeholder="Pickup Date"
              aria-label="Pickup date"
              onFocus={(e) => {
                e.target.type = "date";
              }}
            />
            <input
              className={styles.field}
              type="text"
              name="end_date"
              placeholder="Dropoff Date"
              aria-label="Dropoff date"
              onFocus={(e) => {
                e.target.type = "date";
              }}
            />
            <input
              className={styles.field}
              type="text"
              name="pickup_time"
              placeholder="Pickup Time"
              aria-label="Pickup time"
              onFocus={(e) => {
                e.target.type = "time";
              }}
            />
            <input
              className={styles.field}
              type="text"
              name="dropoff_time"
              placeholder="Dropoff Time"
              aria-label="Dropoff time"
              onFocus={(e) => {
                e.target.type = "time";
              }}
            />
          </div>

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
                disabled={quantity >= gadget.stock}
                onClick={() => setQuantity((q) => Math.min(gadget.stock, q + 1))}
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
