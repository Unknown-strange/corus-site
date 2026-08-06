"use client";

import { useRef, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Image from "next/image";
import { Upload, ArrowLeft } from "lucide-react";
import NavbarAdmin from "@/components/NavbarAdmin";
import Footer from "@/components/Footer";
import styles from "./page.module.css";

// ─── Component that uses useSearchParams ───
function AddPackageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const type = searchParams.get("type") || "rental";

  const fileInputRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [tag, setTag] = useState("");
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const payload = {
      name,
      description,
      price,
      tag,
      image: preview,
      type,
    };

    console.log("Submitting gadget:", payload);

    setTimeout(() => {
      setLoading(false);
      router.push(`/admin/Manage/booking/packages`);
    }, 1000);
  };

  return (
    <main className={styles.page}>
      <section className={styles.header}>
        <button
          className={styles.backButton}
          onClick={() => router.push(`/admin/Manage/booking/packages`)}
        >
          <ArrowLeft size={24} />
        </button>
        <h1>ADD PACKAGES</h1>
      </section>

      <section className={styles.body}>
        <form className={styles.form} onSubmit={handleSubmit}>
          <input
            type="number"
            placeholder="Price (GH₵)"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            className={styles.input}
          />
          <textarea
            placeholder={`Description of Package (${description.length}/300)`}
            maxLength={300}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className={styles.textarea}
          />
          <button type="submit" className={styles.saveButton} disabled={loading}>
            {loading ? "Saving..." : "Save"}
          </button>
        </form>
      </section>
    </main>
  );
}

// ─── Main page component with Suspense boundary ───
export default function AddRentalPage() {
  return (
    <>
      <NavbarAdmin />
      <Suspense fallback={<div>Loading...</div>}>
        <AddPackageContent />
      </Suspense>
      <Footer />
    </>
  );
}

// ─── Force dynamic rendering ───
export const dynamic = "force-dynamic";