"use client";

import { useState, useEffect } from "react";
import GadgetCard from "./GadgetCard";
import RentalsToolbar, { type Category } from "./RentalsToolbar";
import StudioHero from "./StudioHero";
import { RentEquipment } from "@/lib/types";
import api from "@/lib/api";
import styles from "./RentalsScreen.module.css";

export default function RentalsScreen() {
  const [equipment, setEquipment] = useState<RentEquipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<Category | null>(null);
  const [notice, setNotice] = useState("");
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  // Fetch initial data
  useEffect(() => {
    const fetchEquipment = async () => {
      try {
        const res = await api.rentals.equipment();
        if (!res.ok) throw new Error("Failed to load equipment");
        const data = await res.json();
        setEquipment(data);
        // If the API returned all items at once, there is no pagination
        setHasMore(false); // since /rentals/equipment returns all, we disable "View More"
        setLoading(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error loading equipment");
        setLoading(false);
      }
    };
    fetchEquipment();
  }, []);

  // Filter logic (client‑side)
  const query = search.trim().toLowerCase();
  const filtered = equipment.filter((item) => {
    const matchName = item.name.toLowerCase().includes(query);
    // Category filtering: if we had category on the item, we'd filter here.
    // Since the API doesn't provide category, we skip category filter.
    return matchName;
  });

  // Handle category change (UI only – no backend support)
  function handleCategory(next: Category | null) {
    setCategory(next);
    setNotice(
      next
        ? "Category filters aren't connected — rent equipment has no category field in the API yet."
        : ""
    );
  }

  // "View More" handler (pagination not supported by /rentals/equipment)
  const handleViewMore = () => {
    setNotice("All equipment is already loaded – no more items to show.");
  };

  if (loading) {
    return (
      <div className={styles.page}>
        <RentalsToolbar
          search={search}
          onSearchChange={setSearch}
          category={category}
          onCategoryChange={handleCategory}
        />
        <div className={styles.loading}>Loading equipment...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.page}>
        <RentalsToolbar
          search={search}
          onSearchChange={setSearch}
          category={category}
          onCategoryChange={handleCategory}
        />
        <div className={styles.error}>Error: {error}</div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <RentalsToolbar
        search={search}
        onSearchChange={setSearch}
        category={category}
        onCategoryChange={handleCategory}
      />

      <div className={styles.heroWrap}>
        <StudioHero />
      </div>

      {notice ? (
        <p className={styles.notice} role="status">
          {notice}
        </p>
      ) : null}

      {filtered.length > 0 ? (
        <div className={styles.grid}>
          {filtered.map((item) => (
            <GadgetCard key={item.id} gadget={item} />
          ))}
        </div>
      ) : (
        <p className={styles.empty}>No equipment matches “{search}”.</p>
      )}

      {/* View More – disabled since all items are already loaded */}
      <div className={styles.moreRow}>
        <button
          type="button"
          className={styles.more}
          onClick={handleViewMore}
          disabled={!hasMore}
        >
          View More
        </button>
      </div>
    </div>
  );
}