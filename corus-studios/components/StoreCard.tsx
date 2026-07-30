"use client";

import Image from "next/image";
import Link from "next/link";
import { CircleAlert } from "lucide-react";
import { formatGhs, type Product } from "@/lib/store-products";
import styles from "./StoreCard.module.css";

/**
 * Template card for one purchasable product.
 *
 * Props mirror `ProductPublicResponse` from `GET /catalog/products`, so feeding
 * it live admin-uploaded stock later needs no changes here. Out of stock
 * (`stock === 0`) renders the design's "Out of Stock" state, which matches the
 * backend rule that out-of-stock products are not addable.
 */
export default function StoreCard({
  product,
  onCartClick,
}: {
  product: Product;
  onCartClick?: (product: Product) => void;
}) {
  const available = product.stock > 0;

  return (
    <article className={`${styles.card} ${available ? "" : styles.cardUnavailable}`}>
      {available ? null : (
        <span className={styles.badge}>
          <CircleAlert size={15} aria-hidden="true" />
          Out of Stock
        </span>
      )}

      <div className={styles.imageWrap}>
        <Image
          src={product.image_url}
          alt={product.name}
          fill
          sizes="(max-width: 40rem) 50vw, (max-width: 64rem) 33vw, 25vw"
          className={styles.image}
        />
      </div>

      {product.condition ? <p className={styles.condition}>{product.condition}</p> : null}

      <h3 className={styles.name}>{product.name}</h3>
      <p className={styles.price}>{formatGhs(product.price)}</p>

      <div className={styles.actions}>
        {available ? (
          <Link href={`/store/products/${product.id}`} className={styles.cta}>
            Buy Now
          </Link>
        ) : (
          <span className={`${styles.cta} ${styles.ctaDisabled}`} aria-disabled="true">
            Buy Now
          </span>
        )}

        <button
          type="button"
          className={styles.cartButton}
          aria-label={`Add ${product.name} to cart`}
          disabled={!available}
          onClick={() => onCartClick?.(product)}
        >
          <Image
            src="/icons/Cart.png"
            alt=""
            width={24}
            height={24}
            className={styles.cartIcon}
          />
        </button>
      </div>
    </article>
  );
}
