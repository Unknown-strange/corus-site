"use client";

import { useRef, useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Image from "next/image";
import { Upload, ArrowLeft } from "lucide-react";
import NavbarAdmin from "@/components/NavbarAdmin";
import Footer from "@/components/Footer";
import styles from "./page.module.css";

export default function EditGadgetPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Read all data from URL
  const id = searchParams.get("id") || "";
  const type = searchParams.get("type") || "rental";
  const initialName = searchParams.get("name") || "";
  const initialDescription = searchParams.get("description") || "";
  const initialPrice = searchParams.get("price") || "";
  const initialTag = searchParams.get("tag") || "";
  const initialImage = searchParams.get("image") || "";
  const initialAvailable = searchParams.get("available") === "true";

  // Form state
  const [name, setName] = useState(initialName);
  const [description, setDescription] = useState(initialDescription);
  const [price, setPrice] = useState(initialPrice);
  const [tag, setTag] = useState(initialTag);
  const [available, setAvailable] = useState(initialAvailable);
  const [preview, setPreview] = useState<string | null>(initialImage || null);
  const [loading, setLoading] = useState(false);

  // Sync state when URL params change
  useEffect(() => {
    setName(initialName);
    setDescription(initialDescription);
    setPrice(initialPrice);
    setTag(initialTag);
    setAvailable(initialAvailable);
    setPreview(initialImage || null);
  }, [initialName, initialDescription, initialPrice, initialTag, initialImage, initialAvailable]);

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
      id,
      name,
      description,
      price,
      tag,
      image: preview,
      available,
      type,
    };

    console.log("Updating gadget:", payload);

    // TODO: Replace with actual API call
    // const response = await fetch("/api/admin/gadgets", {
    //   method: "PUT",
    //   headers: { "Content-Type": "application/json" },
    //   body: JSON.stringify(payload),
    // });

    setTimeout(() => {
      setLoading(false);
      router.push(`./${type === "rental" ? "rentals" : "store"}`);
    }, 1000);
  };

  const typeLabel = type === "rental" ? "Rentals" : "Store";

  return (
    <>
      <NavbarAdmin />

      <main className={styles.page}>
        <section className={styles.header}>
          <button
            className={styles.backButton}
            onClick={() => router.push(`./${type === "rental" ? "rentals" : "store"}`)}
          >
            <ArrowLeft size={24} />
          </button>
          <h1>EDIT GADGET DETAILS</h1>
        </section>

        <section className={styles.body}>
          <form className={styles.form} onSubmit={handleSubmit}>
            {/* Name */}
            <input
              type="text"
              placeholder="Name of Gadget"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={styles.input}
              required
            />

            {/* Description */}
            <textarea
              placeholder={`Description of Gadget (${description.length}/300)`}
              maxLength={300}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className={styles.textarea}
              required
            />
            <span className={styles.charCount}>{description.length}/300</span>

            {/* Price */}
            <input
              type="text"
              placeholder="Price (GH₵)"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              className={styles.input}
              required
            />

            {/* Tag */}
            <input
              type="text"
              placeholder="Tag e.g lens"
              value={tag}
              onChange={(e) => setTag(e.target.value)}
              className={styles.input}
              required
            />

            {/* Availability Toggle */}
            <div className={styles.toggleWrapper}>
              <label className={styles.toggleLabel}>Availability</label>
              <div className={styles.toggleGroup}>
                <button
                  type="button"
                  className={`${styles.toggleBtn} ${available ? styles.toggleActive : ""}`}
                  onClick={() => setAvailable(true)}
                >
                  Available
                </button>
                <button
                  type="button"
                  className={`${styles.toggleBtn} ${!available ? styles.toggleActive : ""}`}
                  onClick={() => setAvailable(false)}
                >
                  Not Available
                </button>
              </div>
            </div>

            {/* Image Upload */}
            <div
              className={styles.upload}
              onClick={() => fileInputRef.current?.click()}
            >
              {preview ? (
                <Image
                  src={preview}
                  alt="preview"
                  width={300}
                  height={220}
                  className={styles.preview}
                />
              ) : (
                <div className={styles.placeholder}>
                  <Upload size={28} strokeWidth={1.5} />
                  <span>
                    Upload an Image of
                    <br />
                    Gadget
                  </span>
                </div>
              )}
              <input
                ref={fileInputRef}
                type="file"
                hidden
                accept="image/*"
                onChange={handleImage}
              />
            </div>

            {/* Save */}
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