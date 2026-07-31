"use client";

import { useState } from "react";
import Image from "next/image";
import { Trash2 } from "lucide-react";
import styles from "./Cart.module.css";
import CartItem, {
  CartItemType,
} from "./CartItem";



export default function Cart() {
  const [cartItems, setCartItems] = useState<CartItemType[]>([
    {
      id: 1,
      name: "Canon 6D Mark II",
      description:
        "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.",
      price: 5000,
      image: "/products/canon.png",
      quantity: 1,
      selected: true,
    },
    {
      id: 2,
      name: "Godox TT520 II",
      description:
        "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.",
      price: 3000,
      image: "/products/godox.png",
      quantity: 1,
      selected: false,
    },
    {
      id: 3,
      name: "Canon 70-200mm",
      description:
        "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.",
      price: 6000,
      image: "/products/lens.png",
      quantity: 1,
      selected: true,
    },
  ]);

  const increase = (id: number) => {
    setCartItems((items) =>
      items.map((item) =>
        item.id === id
          ? { ...item, quantity: item.quantity + 1 }
          : item
      )
    );
  };

  const decrease = (id: number) => {
    setCartItems((items) =>
      items.map((item) =>
        item.id === id && item.quantity > 1
          ? { ...item, quantity: item.quantity - 1 }
          : item
      )
    );
  };

  const toggleSelected = (id: number) => {
    setCartItems((items) =>
      items.map((item) =>
        item.id === id
          ? { ...item, selected: !item.selected }
          : item
      )
    );
  };

  const deleteItem = (id: number) => {
    setCartItems((items) =>
      items.filter((item) => item.id !== id)
    );
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


  return (
    <section className={styles.cartContainer}>
      <div className={styles.header}>Store ({cartItems.length})</div>

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
                onDelete={deleteItem}
                onToggle={toggleSelected}
                />
            ))}
        </div>

      {/* Footer */}

      <div className={styles.footer}>
        <button className={styles.checkout}>
          Checkout
        </button>
      </div>
    </section>
  );
}