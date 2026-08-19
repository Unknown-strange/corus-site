"use client";

import Image from "next/image";
import Link from "next/link";
import { CircleAlert, ShoppingCart } from "lucide-react";

import { CatalogProduct } from "@/lib/types";
import styles from "./StoreCard.module.css";

type Props = {
  product: CatalogProduct;
  onCartClick?: (product: CatalogProduct) => void;
};

export default function StoreCard({
  product,
  onCartClick,
}: Props) {
  const available = product.stock > 0;

  const price =
    Number.parseFloat(product.price);

  return (
    <article
      className={`${styles.card} ${
        available
          ? ""
          : styles.cardUnavailable
      }`}
    >
      {!available && (
        <span className={styles.badge}>
          <CircleAlert
            size={15}
            aria-hidden="true"
          />
          Out of Stock
        </span>
      )}

      <div className={styles.imageWrap}>
        <Image
          src={
            product.image_url ||
            "/images/placeholder.png"
          }
          alt={product.name}
          fill
          sizes="(max-width: 40rem) 50vw, (max-width: 64rem) 33vw, 25vw"
          className={styles.image}
        />
      </div>

      {product.category && (
        <p className={styles.condition}>
          {product.category.name}
        </p>
      )}

      <h3 className={styles.name}>
        {product.name}
      </h3>

      <p className={styles.price}>
        GH₵
        {price.toLocaleString("en-GH", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}
      </p>

      <div className={styles.actions}>
        {available ? (
          <Link
            href={`/store/products/${product.slug}`}
            className={styles.cta}
          >
            Buy Now
          </Link>
        ) : (
          <span
            className={`${styles.cta} ${styles.ctaDisabled}`}
            aria-disabled="true"
          >
            Buy Now
          </span>
        )}

        <button
          type="button"
          className={styles.cartButton}
          aria-label={`Add ${product.name} to cart`}
          disabled={!available}
          onClick={() =>
            onCartClick?.(product)
          }
        >
          <ShoppingCart
            size={20}
            strokeWidth={2}
          />
        </button>
      </div>
    </article>
  );
}