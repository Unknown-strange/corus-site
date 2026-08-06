"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { Edit, Plus } from "lucide-react";
import NavbarAdmin from "@/components/NavbarAdmin";
import Footer from "@/components/Footer";
import styles from "./page.module.css";

type StoreItem = {
  id: string;
  name: string;
  available: boolean;
  image: string;
  description: string; // ← added
  price: string;       // ← added
  tag: string;         // ← added
};

const mockStoreItems: StoreItem[] = [
  {
    id: "1",
    name: "Canon 6D Mark II",
    available: true,
    image: "/products/canon.png",
    description: "Full-frame DSLR with 26MP sensor",
    price: "200",
    tag: "camera",
  },
  {
    id: "2",
    name: "Godox TT520 II",
    available: true,
    image: "/products/godox.png",
    description: "Compact flash with wireless trigger",
    price: "150",
    tag: "lighting",
  },
  {
    id: "3",
    name: "Canon 50mm Lens",
    available: false,
    image: "/products/lens.png",
    description: "Prime lens with f/1.8 aperture",
    price: "85",
    tag: "lens",
  },
];

export default function StoreAdmin() {
  const [storeItems, setStoreItems] = useState<StoreItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setTimeout(() => {
      setStoreItems(mockStoreItems);
      setLoading(false);
    }, 600);
  }, []);

  return (
    <>
      <NavbarAdmin />
      <div className={styles.page}>
        <div className={styles.container}>
          <h1 className={styles.heading}>MANAGE YOUR STORE</h1>

          {loading ? (
            <div className={styles.loading}>Loading Products...</div>
          ) : (
            <>
              <div className={styles.grid}>
                {storeItems.map((item) => (
                  <div key={item.id} className={styles.card}>
                    <div className={styles.cardContent}>
                      {/* Left: Image */}
                      <div className={styles.imageWrapper}>
                        <Image
                          src={item.image}
                          alt={item.name}
                          width={80}
                          height={80}
                          className={styles.cardImage}
                        />
                      </div>

                      {/* Middle: Name + Availability */}
                      <div className={styles.info}>
                        <h3 className={styles.cardTitle}>{item.name}</h3>
                        <span
                          className={`${styles.availability} ${
                            item.available ? styles.available : styles.unavailable
                          }`}
                        >
                          {item.available ? "In Stock" : "Out of Stock"}
                        </span>
                      </div>

                      {/* Right: Edit icon */}
                      <Link
                        href={`/admin/Manage/edit?id=${item.id}&name=${encodeURIComponent(item.name)}&description=${encodeURIComponent(item.description)}&price=${encodeURIComponent(item.price)}&tag=${encodeURIComponent(item.tag)}&image=${encodeURIComponent(item.image)}&available=${item.available}&type=store`}
                        className={styles.editLink}
                        aria-label="Edit product"
                      >
                        <Edit size={22} className={styles.editIcon} />
                      </Link>
                    </div>
                  </div>
                ))}
              </div>

              {/* Add button */}
              <div className={styles.addButtonWrapper}>
                <Link href="/admin/Manage/add?type=store" className={styles.addButton}>
                  <Plus size={20} />
                  Add Gadget
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
      <Footer />
    </>
  );
}