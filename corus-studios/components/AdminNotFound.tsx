"use client";

import Link from "next/link";
import {
  Search,
  ArrowLeft,
} from "lucide-react";

import styles from "./AdminNotFound.module.css";

export default function AdminNotFound() {
  return (
    <main
      className={
        styles.page
      }
    >
      <div
        className={
          styles.container
        }
      >
        <div
          className={
            styles.code
          }
        >
          404
        </div>

        <div
          className={
            styles.illustration
          }
          aria-hidden="true"
        >
          <div
            className={
              styles.circle
            }
          />

          <Search
            className={
              styles.searchIcon
            }
            size={34}
          />
        </div>

        <h1>
          Page not found
        </h1>

        <p>
          The page you're looking for
          doesn't exist.
        </p>
      </div>
    </main>
  );
}