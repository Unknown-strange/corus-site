"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import NavbarAdmin from "@/components/NavbarAdmin";
import Footer from "@/components/Footer";
import styles from "./page.module.css";

export default function EditPackagePage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Get data from URL
  const id = searchParams.get("id") || "";
  const initialPrice = searchParams.get("price") || "";
  const initialDescription = searchParams.get("description") || "";

  const [price, setPrice] = useState(initialPrice);
  const [description, setDescription] = useState(initialDescription);
  const [loading, setLoading] = useState(false);

  // Update state if URL params change (e.g., when navigating directly)
  useEffect(() => {
    setPrice(initialPrice);
    setDescription(initialDescription);
  }, [initialPrice, initialDescription]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const payload = {
      id,
      price,
      description,
    };

    console.log("Updating package:", payload);

    // TODO: Replace with actual API call
    // const response = await fetch("/api/admin/packages", {
    //   method: "PUT",
    //   headers: { "Content-Type": "application/json" },
    //   body: JSON.stringify(payload),
    // });

    setTimeout(() => {
      setLoading(false);
      router.push("/admin/Manage/booking/packages");
    }, 1000);
  };

  return (
    <>
      <NavbarAdmin />

      <main className={styles.page}>
        <section className={styles.header}>
          <button
            className={styles.backButton}
            onClick={() => router.push("/admin/Manage/booking/packages")}
          >
            <ArrowLeft size={24} />
          </button>
          <h1>EDIT PACKAGE</h1>
        </section>

        <section className={styles.body}>
          <form className={styles.form} onSubmit={handleSubmit}>
            {/* Price */}
            <input
              type="text" // keep as text to allow "GH$200" format, or use number if you prefer
              placeholder="Price (GH₵)"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              className={styles.input}
              required
            />

            {/* Description */}
            <textarea
              placeholder="Description of Package"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className={styles.textarea}
              maxLength={300}
              required
            />
            <span className={styles.charCount}>{description.length}/300</span>

            <button type="submit" className={styles.saveButton} disabled={loading}>
              {loading ? "Saving..." : "Save Changes"}
            </button>
          </form>
        </section>
      </main>

      <Footer />
    </>
  );
}