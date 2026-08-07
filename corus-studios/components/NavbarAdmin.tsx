"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  UserCircle2,
  User,
  ShoppingCart,
  FileText,
  Calendar,
  Settings,
  HelpCircle,
  Shield,
  LifeBuoy,
  LogOut,
} from "lucide-react";
import { useState, useEffect } from "react";
import styles from "./NavbarAdmin.module.css";

const links = [
  { name: "Home", href: "/admin" },
  { name: "Manage", href: "/admin/Manage" },
  { name: "Bookings", href: "/admin/Bookings" },
  { name: "Rentals", href: "/admin/Rentals" },
  { name: "Orders", href: "/admin/Orders" },
  { name: "Finance", href: "/admin/Finance" },
];

// ─── Dropdown items are no longer used ───
// Removed dropdownItems array

export default function NavbarAdmin() {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  const [user, setUser] = useState<{ username: string; firstName?: string } | null>(null);

  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch {
        setUser(null);
      }
    }
  }, []);

  const toggleMenu = () => setIsOpen(!isOpen);
  const closeMenu = () => setIsOpen(false);

  const isCurrent = (href: string) => href.startsWith("/") && href === pathname;

  const handleLogout = () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("user");
    setUser(null);
    router.push("/");
  };

  const userInitial = user?.username?.[0]?.toUpperCase() || "?";

  return (
    <header className={styles.header}>
      <nav className={styles.nav}>
        {/* Hamburger button */}
        <button className={styles.mobileButton} onClick={toggleMenu} aria-label="Toggle menu">
          <div className={`${styles.hamburgerWrapper} ${isOpen ? styles.open : ""}`}>
            <span className={styles.line}></span>
            <span className={styles.line}></span>
            <span className={styles.line}></span>
          </div>
        </button>

        {/* ─── Mobile‑only user avatar / login (no dropdown) ─── */}
        {user ? (
          <div className={styles.mobileUser}>
            <div className={styles.mobileUserAvatar}>
              <div className={styles.avatarCircle}>{userInitial}</div>
              <span className={styles.userName}>{user.username}</span>
            </div>
            {/* ─── Add logout button on mobile if desired ─── */}
            <button
              className={styles.mobileLogout}
              onClick={handleLogout}
              aria-label="Logout"
            >
              <LogOut size={18} />
            </button>
          </div>
        ) : (
          <Link href="/login" className={styles.mobileLogin}>
            <UserCircle2 size={20} />
            <span>Log In</span>
          </Link>
        )}

        {/* ─── Desktop‑only center group ─── */}
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
          {user ? (
            <div className={styles.desktopUser}>
              <div className={styles.userAvatar}>
                <div className={styles.avatarCircle}>{userInitial}</div>
                <span className={styles.userName}>{user.username}</span>
              </div>
              {/* ─── Desktop logout button ─── */}
              <button
                className={styles.desktopLogout}
                onClick={handleLogout}
                aria-label="Logout"
              >
                <LogOut size={18} />
              </button>
            </div>
          ) : (
            <Link href="/login" className={styles.loginLink}>
              <UserCircle2 size={20} />
              Log In
            </Link>
          )}
        </div>
      </nav>

      {/* Mobile Menu (hamburger) */}
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