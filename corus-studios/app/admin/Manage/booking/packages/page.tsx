"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Edit, Plus, Trash2 } from "lucide-react";
import NavbarAdmin from "@/components/NavbarAdmin";
import Footer from "@/components/Footer";
import styles from "./page.module.css";

type PackageItem = {
  id: string;
  price: string;
  description: string;
};

const mockPackages: PackageItem[] = [
  { id: "1", price: "GH$200", description: "2 Retouched  1 Edited Picture" },
  { id: "2", price: "GH$200", description: "2 Retouched  1 Edited Picture" },
  { id: "3", price: "GH$200", description: "2 Retouched  1 Edited Picture" },
];

export default function PackagesAdmin() {
  const [packages, setPackages] = useState<PackageItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setTimeout(() => {
      setPackages(mockPackages);
      setLoading(false);
    }, 600);
  }, []);

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this package?")) {
      setPackages(packages.filter((pkg) => pkg.id !== id));
      // TODO: API call to delete
    }
  };

  return (
    <>
      <NavbarAdmin />
      <div className={styles.page}>
        <div className={styles.container}>
          <h1 className={styles.heading}>MANAGE YOUR PACKAGES</h1>

          {loading ? (
            <div className={styles.loading}>Loading packages...</div>
          ) : (
            <>
              <div className={styles.grid}>
                {packages.map((pkg) => (
                  <div key={pkg.id} className={styles.card}>
                    <div className={styles.cardContent}>
                      {/* Left: Price + Description */}
                      <div className={styles.info}>
                        <h3 className={styles.price}>{pkg.price}</h3>
                        <div className={styles.description}>
                          {pkg.description}
                        </div>
                      </div>

                      {/* Right: Delete + Edit icons */}
                      <div className={styles.actions}>
                        <button
                          className={styles.deleteButton}
                          onClick={() => handleDelete(pkg.id)}
                          aria-label="Delete package"
                        >
                          <Trash2 size={20} />
                        </button>
                        <Link
                            href={`/admin/Manage/booking/packages/edit?price=${encodeURIComponent(pkg.price)}&description=${encodeURIComponent(pkg.description)}&id=${pkg.id}`}
                            className={styles.editLink}
                            aria-label="Edit package"
                        >
                          <Edit size={20} className={styles.editIcon} />
                        </Link>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Add button */}
              <div className={styles.addButtonWrapper}>
                <Link href="./packages/add" className={styles.addButton}>
                  <Plus size={20} />
                  Add Package
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