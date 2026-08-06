"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import NavbarAdmin from "@/components/NavbarAdmin";
import Footer from "@/components/Footer";
import styles from "./page.module.css";

// ─── Component that uses useSearchParams ───
function EditPackageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const id = searchParams.get("id") || "";
  const initialPrice = searchParams.get("price") || "";
  const initialDescription = searchParams.get("description") || "";

  const [price, setPrice] = useState(initialPrice);
  const [description, setDescription] = useState(initialDescription);
  const [loading, setLoading] = useState(false);

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

    setTimeout(() => {
      setLoading(false);
      router.push("/admin/Manage/booking/packages");
    }, 1000);
  };

  return (
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
          <input
            type="text"
            placeholder="Price (GH₵)"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            className={styles.input}
            required
          />
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
  );
}

// ─── Main page component with Suspense ───
export default function EditPackagePage() {
  return (
    <>
      <NavbarAdmin />
      <Suspense fallback={<div>Loading...</div>}>
        <EditPackageContent />
      </Suspense>
      <Footer />
    </>
  );
}

// ─── Force dynamic rendering ───
export const dynamic = "force-dynamic";