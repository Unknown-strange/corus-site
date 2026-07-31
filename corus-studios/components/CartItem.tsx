"use client";

import Image from "next/image";
import { Trash2 } from "lucide-react";
import styles from "./CartItem.module.css";

export type CartItemType = {
  id: number;
  productId: string; // UUID from API
  name: string;
  description: string;
  price: number;
  image: string;
  quantity: number;
  selected: boolean;
  stock?: number;
  slug?: string;
  lineTotal?: number;
};

type Props = {
  item: CartItemType;
  onIncrease: (id: number) => void;
  onDecrease: (id: number) => void;
  onDelete: (id: number) => void;
  onToggle: (id: number) => void;
};

export default function CartItem({
  item,
  onIncrease,
  onDecrease,
  onDelete,
  onToggle,
}: Props) {
  return (
    <div className={styles.cartItem}>
      {/* Select */}
      <input
        type="checkbox"
        checked={item.selected}
        onChange={() => onToggle(item.id)}
      />

      {/* Image */}
      <div className={styles.imageBox}>
        <Image
          src={item.image}
          alt={item.name}
          fill
          className={styles.image}
          onError={(e) => {
            // Fallback if image fails to load
            (e.target as HTMLImageElement).src = "/images/placeholder.png";
          }}
        />
      </div>

      {/* Info */}
      <div className={styles.info}>
        <div className={styles.name}>{item.name}</div>
        <p>{item.description || "No description available"}</p>
        <span className={styles.price}>GH₵{item.price.toLocaleString()}</span>

        <div className={styles.quantity}>
          <button onClick={() => onDecrease(item.id)}>-</button>
          <span>{item.quantity}</span>
          <button onClick={() => onIncrease(item.id)}>+</button>
        </div>
      </div>

      {/* Delete */}
      <button
        className={styles.deleteButton}
        onClick={() => onDelete(item.id)}
      >
        <Trash2 size={22} />
      </button>
    </div>
  );
}