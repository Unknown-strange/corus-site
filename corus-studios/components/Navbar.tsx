"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserCircle2 } from "lucide-react";
import { useState } from "react";
import styles from "./Navbar.module.css";

const links = [
  { name: "Home", href: "/" },
  { name: "Our Gallery", href: "#gallery" },
  { name: "Rentals", href: "/rentals" },
  { name: "Store", href: "#store" },
];

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();

  const toggleMenu = () => setIsOpen(!isOpen);
  const closeMenu = () => setIsOpen(false);

  /** Only real routes can be current — the in-page hash links never are. */
  const isCurrent = (href: string) => href.startsWith("/") && href === pathname;

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
                <Link
                  href={link.href}
                  className={`${styles.navLink} ${isCurrent(link.href) ? styles.navLinkActive : ""}`}
                  aria-current={isCurrent(link.href) ? "page" : undefined}
                >
                  {link.name}
                </Link>
              </li>
            ))}
          </ul>
          <Link href="/login" className={styles.loginLink}>
            <UserCircle2 size={20} />
            Log In
          </Link>
        </div>
      </nav>

      {/* ─── Mobile Menu (slide‑down) ─── */}
      <div className={`${styles.mobileMenu} ${isOpen ? styles.open : ""}`}>
        <ul>
          {links.map((link) => (
            <li key={link.name} onClick={closeMenu}>
              <Link
                href={link.href}
                className={`${styles.mobileNavLink} ${isCurrent(link.href) ? styles.navLinkActive : ""}`}
                aria-current={isCurrent(link.href) ? "page" : undefined}
              >
                {link.name}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </header>
  );
}
