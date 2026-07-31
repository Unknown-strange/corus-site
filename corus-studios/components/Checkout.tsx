"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { useAuthState } from "@/lib/use-signed-in-user";
import {
  DUMMY_CART_ITEMS,
  PLACEHOLDER_DELIVERY_FEE_GHS,
  PLACEHOLDER_SERVICE_FEE_GHS,
  cartSubtotal,
  formatAmount,
  formatGhsAmount,
} from "@/lib/checkout-cart";
import styles from "./Checkout.module.css";

/**
 * Checkout: cart contents, cost summary, payment.
 *
 * The cart and order endpoints are customer-only, so this screen is gated on
 * being signed in.
 *
 * Service Fee and Delivery Fee have no backend behind them; see the warning at
 * the top of lib/checkout-cart.ts. The grand total shown here is therefore a
 * frontend calculation, and must be replaced by `amount_ghs` from the API when
 * this is wired — the frontend must never be the authority on what a customer
 * is charged.
 */
export default function Checkout() {
  const [notice, setNotice] = useState("");
  const auth = useAuthState();

  const items = DUMMY_CART_ITEMS;
  const subtotal = cartSubtotal(items);
  const grandTotal = subtotal + PLACEHOLDER_SERVICE_FEE_GHS + PLACEHOLDER_DELIVERY_FEE_GHS;

  /**
   * NOT WIRED TO THE API.
   *
   * `POST /orders/checkout` converts the whole cart and returns
   * `{ order_id, authorization_url, reference, public_key, amount_ghs }`.
   * Paying means redirecting to `authorization_url`; Paystack then returns the
   * customer to the callback route, which confirms with
   * `GET /payments/verify/{reference}`.
   *
   * Stock is reduced at checkout, and the order is voided after
   * ORDER_PAYMENT_MINUTES (15) if payment does not complete.
   */
  function handlePay() {
    setNotice(
      "Not connected yet — payment goes through POST /orders/checkout, which needs sign-in and the API client."
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.band}>
        <h1 className={styles.heading}>Checkout</h1>
      </div>

      {auth.status === "checking" ? (
        <div className={styles.message} role="status">
          Checking your account…
        </div>
      ) : auth.status === "signed-out" ? (
        <div className={styles.message}>
          <p className={styles.messageTitle}>You need to be signed in.</p>
          <p>Log in to review your cart and pay for it.</p>
          <Link href="/login" className={styles.messageLink}>
            Log In
          </Link>
        </div>
      ) : items.length === 0 ? (
        <div className={styles.message}>
          <p className={styles.messageTitle}>Your cart is empty.</p>
          <p>Add something from the store and it will show up here.</p>
          <Link href="/store" className={styles.messageLink}>
            Go to Store
          </Link>
        </div>
      ) : (
        <div className={styles.body}>
          <div className={styles.thumbs}>
            {items.map((item) => (
              <div key={item.product_id} className={styles.thumb}>
                <Image
                  src={item.image_url}
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
                <span>{formatAmount(subtotal)}</span>
              </p>
              <p className={styles.line}>
                <span>Service Fee</span>
                <span>{formatAmount(PLACEHOLDER_SERVICE_FEE_GHS)}</span>
              </p>
              <p className={styles.line}>
                <span>Delivery Fee</span>
                <span>{formatAmount(PLACEHOLDER_DELIVERY_FEE_GHS)}</span>
              </p>
            </div>

            <div className={styles.total}>
              <p className={styles.totalLabel}>Grand Total</p>
              <p className={styles.totalValue}>{formatGhsAmount(grandTotal)}</p>
            </div>
          </div>

          <div className={styles.actions}>
            <button type="button" className={styles.pay} onClick={handlePay}>
              Proceed to Payment
            </button>
          </div>

          {notice ? (
            <p className={styles.notice} role="status">
              {notice}
            </p>
          ) : null}
        </div>
      )}
    </div>
  );
}
