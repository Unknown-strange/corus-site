"use client";

import { useState } from "react";
import GadgetCard from "./GadgetCard";
import RentalsToolbar, { type Category } from "./RentalsToolbar";
import StudioHero from "./StudioHero";
import { DUMMY_GADGETS } from "@/lib/gadgets";
import styles from "./RentalsScreen.module.css";

export default function RentalsScreen() {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<Category | null>(null);
  const [notice, setNotice] = useState("");

  const query = search.trim().toLowerCase();
  const gadgets = query
    ? DUMMY_GADGETS.filter((gadget) => gadget.name.toLowerCase().includes(query))
    : DUMMY_GADGETS;

  /**
   * Category filtering is deliberately not implemented.
   *
   * `EquipmentForRent` has no category column and `GET /rentals/equipment`
   * takes no filter parameters, so there is nothing to filter on. Guessing a
   * category from the product name would invent data. The buttons keep their
   * selected state so the interaction is visible; wire them up once the
   * backend adds categories to rent equipment.
   */
  function handleCategory(next: Category | null) {
    setCategory(next);
    setNotice(
      next
        ? "Category filters aren't connected — rent equipment has no category field in the API yet."
        : ""
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

      {gadgets.length > 0 ? (
        <div className={styles.grid}>
          {gadgets.map((gadget) => (
            <GadgetCard key={gadget.id} gadget={gadget} />
          ))}
        </div>
      ) : (
        <p className={styles.empty}>No gadgets match “{search}”.</p>
      )}

      <div className={styles.moreRow}>
        <button
          type="button"
          className={styles.more}
          onClick={() =>
            setNotice("Nothing more to load — the catalogue is placeholder data until the API is wired up.")
          }
        >
          View More
        </button>
      </div>
    </div>
  );
}
