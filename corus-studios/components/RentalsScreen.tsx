"use client";

import {
  useEffect,
  useState,
} from "react";

import GadgetCard from "./GadgetCard";
import RentalsToolbar from "./RentalsToolbar";
import StudioHero from "./StudioHero";

import type {
  RentEquipment,
} from "@/lib/types";

import api from "@/lib/api";

import styles from "./RentalsScreen.module.css";

export default function RentalsScreen() {
  const [
    equipment,
    setEquipment,
  ] = useState<RentEquipment[]>(
    []
  );

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    error,
    setError,
  ] = useState<string | null>(
    null
  );

  const [
    search,
    setSearch,
  ] = useState("");

  useEffect(() => {
    let mounted = true;

    const fetchEquipment =
      async () => {
        try {
          setLoading(true);
          setError(null);

          const response =
            await api.rentals.equipment();

          if (!response.ok) {
            throw new Error(
              "Failed to load equipment"
            );
          }

          const data =
            await response.json();

          if (!mounted) {
            return;
          }

          setEquipment(
            Array.isArray(data)
              ? data
              : []
          );
        } catch (err) {
          console.error(
            "Failed to load rental equipment:",
            err
          );

          if (mounted) {
            setError(
              err instanceof Error
                ? err.message
                : "Error loading equipment"
            );
          }
        } finally {
          if (mounted) {
            setLoading(false);
          }
        }
      };

    fetchEquipment();

    return () => {
      mounted = false;
    };
  }, []);

  /* =========================================================
     SEARCH
  ========================================================= */

  const query =
    search
      .trim()
      .toLowerCase();

  const filtered =
    equipment.filter(
      (item) => {
        if (!query) {
          return true;
        }

        return (
          item.name
            .toLowerCase()
            .includes(query) ||
          item.description
            .toLowerCase()
            .includes(query) ||
          item.slug
            .toLowerCase()
            .includes(query)
        );
      }
    );

  /* =========================================================
     TOOLBAR
  ========================================================= */

  const toolbar = (
    <RentalsToolbar
      search={search}
      onSearchChange={
        setSearch
      }
    />
  );

  /* =========================================================
     LOADING
  ========================================================= */

  if (loading) {
    return (
      <div
        className={
          styles.page
        }
      >
        {toolbar}

        <div
          className={
            styles.loading
          }
        >
          Loading equipment...
        </div>
      </div>
    );
  }

  /* =========================================================
     ERROR
  ========================================================= */

  if (error) {
    return (
      <div
        className={
          styles.page
        }
      >
        {toolbar}

        <div
          className={
            styles.error
          }
        >
          <h2>
            Unable to load rental
            equipment
          </h2>

          <p>
            {error}
          </p>
        </div>
      </div>
    );
  }

  /* =========================================================
     MAIN
  ========================================================= */

  return (
    <div
      className={
        styles.page
      }
    >
      {toolbar}

      <div
        className={
          styles.heroWrap
        }
      >
        <StudioHero />
      </div>

      {filtered.length > 0 ? (
        <div
          className={
            styles.grid
          }
        >
          {filtered.map(
            (item) => (
              <GadgetCard
                key={item.id}
                gadget={item}
              />
            )
          )}
        </div>
      ) : (
        <div
          className={
            styles.empty
          }
        >
          <h3>
            No equipment found
          </h3>

          <p>
            {search
              ? `No rental equipment matches "${search}".`
              : "There is currently no rental equipment available."}
          </p>

          {search && (
            <button
              type="button"
              onClick={() =>
                setSearch("")
              }
            >
              Clear search
            </button>
          )}
        </div>
      )}
    </div>
  );
}