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
  LifeBuoy,
  LogOut,
} from "lucide-react";
import { useState, useEffect, useRef } from "react";
import styles from "./Navbar.module.css";

const links = [
  { name: "Home", href: "/" },
  { name: "Our Gallery", href: "#gallery" },
  { name: "Rentals", href: "/rentals" },
  { name: "Store", href: "/store" },
];

const dropdownItems = [
  { icon: ShoppingCart, label: "My Cart", href: "/cart" },
  { icon: FileText, label: "My Requests", href: "/requests" },
  { icon: Calendar, label: "My Bookings", href: "/bookings" },
  { icon: Settings, label: "Settings", href: "/settings" },
  { icon: HelpCircle, label: "Help", href: "/help" },
  { icon: LifeBuoy, label: "Contact Support", href: "/support" },
];

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [mobileDropdownOpen, setMobileDropdownOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const dropdownRef = useRef<HTMLDivElement>(null);
  const mobileDropdownRef = useRef<HTMLDivElement>(null);

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

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
      if (mobileDropdownRef.current && !mobileDropdownRef.current.contains(event.target as Node)) {
        setMobileDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const toggleMenu = () => setIsOpen(!isOpen);
  const closeMenu = () => setIsOpen(false);

  const isCurrent = (href: string) => href.startsWith("/") && href === pathname;

  const handleLogout = () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("user");
    setUser(null);
    setDropdownOpen(false);
    setMobileDropdownOpen(false);
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

        {/* ─── Mobile‑only user avatar / login ─── */}
        {user ? (
          <div className={styles.mobileUser} ref={mobileDropdownRef}>
            <div
              className={styles.mobileUserAvatar}
              onClick={() => setMobileDropdownOpen(!mobileDropdownOpen)}
            >
              <div className={styles.avatarCircle}>{userInitial}</div>
              <span className={styles.userName}>{user.username}</span>
            </div>
            {mobileDropdownOpen && (
              <div className={styles.mobileDropdown}>
                <div className={styles.dropdownHeader}>
                  <User size={18} className={styles.dropdownIcon} />
                  <span>Welcome back,</span>
                </div>
                <div className={styles.dropdownUsername}>{user.username}</div>
                <button className={styles.dropdownSignOut} onClick={handleLogout}>
                  <LogOut size={18} />
                  Sign out
                </button>
                <div className={styles.dropdownDivider} />
                {dropdownItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.label}
                      href={item.href}
                      className={styles.dropdownItem}
                      onClick={() => setMobileDropdownOpen(false)}
                    >
                      <Icon size={18} />
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            )}
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
            <div className={styles.desktopUser} ref={dropdownRef}>
              <div
                className={styles.userAvatar}
                onClick={() => setDropdownOpen(!dropdownOpen)}
              >
                <div className={styles.avatarCircle}>{userInitial}</div>
                <span className={styles.userName}>{user.username}</span>
              </div>
              {dropdownOpen && (
                <div className={styles.dropdown}>
                  <div className={styles.dropdownHeader}>
                    <User size={18} className={styles.dropdownIcon} />
                    <span>Welcome back,</span>
                  </div>
                  <div className={styles.dropdownUsername}>{user.username}</div>
                  <button className={styles.dropdownSignOut} onClick={handleLogout}>
                    <LogOut size={18} />
                    Sign out
                  </button>
                  <div className={styles.dropdownDivider} />
                  {dropdownItems.map((item) => {
                    const Icon = item.icon;
                    return (
                      <Link
                        key={item.label}
                        href={item.href}
                        className={styles.dropdownItem}
                        onClick={() => setDropdownOpen(false)}
                      >
                        <Icon size={18} />
                        {item.label}
                      </Link>
                    );
                  })}
                </div>
              )}
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