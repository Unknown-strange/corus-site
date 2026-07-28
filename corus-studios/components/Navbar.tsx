"use client";

import Link from "next/link";
import { Camera, UserCircle2 } from "lucide-react";
import { useState } from "react";
import styles from "./Navbar.module.css";

const links = [
  { name: "Home", href: "/" },
  { name: "Our Gallery", href: "#gallery" },
  { name: "Rentals", href: "#rentals" },
  { name: "Store", href: "#store" },
];

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);

  const toggleMenu = () => setIsOpen(!isOpen);
  const closeMenu = () => setIsOpen(false);

  return (
    <header className={styles.header}>
      <nav className={styles.nav}>

        {/* ─── Hamburger button with animated X ─── */}
        <button className={styles.mobileButton} onClick={toggleMenu} aria-label="Toggle menu">
          <div className={`${styles.hamburgerWrapper} ${isOpen ? styles.open : ""}`}>
            <span className={styles.line}></span>
            <span className={styles.line}></span>
            <span className={styles.line}></span>
          </div>
        </button>

        {/* ─── Mobile‑only login (pushed to far right) ─── */}
        <Link href="/login" className={styles.mobileLogin}>
          <UserCircle2 size={20} />
          <span>Log In</span>
        </Link>

        {/* ─── Desktop‑only center group (hidden on mobile) ─── */}
        <div className={styles.navCenter}>
          <ul className={styles.desktopMenu}>
            {links.map((link) => (
              <li key={link.name}>
                <Link href={link.href} className={styles.navLink}>
                  {link.name}
                </Link>
              </li>
            ))}
          </ul>
          <div className={styles.authGroup}>
            <Link href="/login" className={styles.loginLink}>
              <UserCircle2 size={20} />
              Log In
            </Link>
            <Link href="/signup" className={styles.signupLink}>
              Sign Up
            </Link>
          </div>
        </div>
      </nav>

      {/* ─── Mobile Menu (slide‑down) ─── */}
      <div className={`${styles.mobileMenu} ${isOpen ? styles.open : ""}`}>
        <ul>
          {links.map((link) => (
            <li key={link.name} onClick={closeMenu}>
              <Link href={link.href} className={styles.mobileNavLink}>
                {link.name}
              </Link>
            </li>
          ))}
          <li onClick={closeMenu}>
            <Link href="/signup" className={styles.mobileSignupLink}>
              Sign Up
            </Link>
          </li>
        </ul>
      </div>
    </header>
  );
}