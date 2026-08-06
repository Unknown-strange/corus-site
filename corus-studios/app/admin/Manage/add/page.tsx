"use client";

import { useRef, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation"; // ← added
import Image from "next/image";
import { Upload } from "lucide-react";
import { ArrowLeft } from "lucide-react";
import NavbarAdmin from "@/components/NavbarAdmin";
import Footer from "@/components/Footer";
import styles from "./page.module.css";

export default function AddRentalPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const type = searchParams.get("type") || "rental"; // default to rental

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

    // Build payload with type
    const payload = {
      name,
      description,
      price,
      tag,
      image: preview, // in reality, you'd send a File object as FormData
      type, // ← includes "rental" or "store"
    };

    console.log("Submitting gadget:", payload);

    // TODO: Replace with actual API call
    // const response = await fetch("/api/admin/gadgets", {
    //   method: "POST",
    //   headers: { "Content-Type": "application/json" },
    //   body: JSON.stringify(payload),
    // });

    // Simulate API call
    setTimeout(() => {
      setLoading(false);
      router.push(`/admin/${type === "rental" ? "rentals" : "store"}`);
    }, 1000);
  };

  const typeLabel = type === "rental" ? "Rentals" : "Store";

  return (
    <>
      <NavbarAdmin />

      <main className={styles.page}>

        {/* HEADER */}

        <section className={styles.header}>
              <button
                className={styles.backButton}
                onClick={() => router.push(`/admin/${type === "rental" ? "rentals" : "store"}`)}
            >
                <ArrowLeft size={24} />
            </button>

          <h1>ADD GADGET DETAILS</h1>

        </section>

        {/* BODY */}

        <section className={styles.body}>

          <form
            className={styles.form}
            onSubmit={handleSubmit}
          >

            {/* Name */}

            <input
              type="text"
              placeholder="Name of Gadget"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={styles.input}
            />

            {/* Description */}

            <textarea
              placeholder={`Description of Gadget (${description.length}/300)`}
              maxLength={300}
              value={description}
              onChange={(e) =>
                setDescription(e.target.value)
              }
              className={styles.textarea}
            />

            {/* Price */}

            <input
              type="number"
              placeholder="Price (GH₵)"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              className={styles.input}
            />

            {/* Tag */}

            <input
              type="text"
              placeholder="Tag e.g lens"
              value={tag}
              onChange={(e) => setTag(e.target.value)}
              className={styles.input}
            />

            {/* Upload */}

            <div
              className={styles.upload}
              onClick={() =>
                fileInputRef.current?.click()
              }
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

                  <Upload
                    size={28}
                    strokeWidth={1.5}
                  />

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

            <button
              type="submit"
              className={styles.saveButton}
            >
              Save
            </button>

          </form>

        </section>

      </main>

      <Footer />

    </>
  );
}