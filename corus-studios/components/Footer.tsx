"use client";

import Link from "next/link";
import Image from "next/image";
import { FaInstagram, FaFacebook, FaTwitter, FaYoutube } from "react-icons/fa";
import styles from "./Footer.module.css";

const links = [
  { name: "Home", href: "/" },
  { name: "Our Gallery", href: "#gallery" },
  { name: "Rentals", href: "#rentals" },
  { name: "Store", href: "#store" },
];

const socialLinks = [
  { name: "Instagram", icon: FaInstagram, href: "#" },
  { name: "Facebook", icon: FaFacebook, href: "#" },
  { name: "Twitter", icon: FaTwitter, href: "#" },
  { name: "YouTube", icon: FaYoutube, href: "#" },
];

export default function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={styles.container}>
        {/* ─── LEFT: Brand + Social ─── */}
        <div className={styles.left}>
          <h2 className={styles.brandName}>Corus Studio</h2>
          <div className={styles.socialIcons}>
            {socialLinks.map((social) => {
              const Icon = social.icon;
              return (
                <a
                  key={social.name}
                  href={social.href}
                  className={styles.socialLink}
                  aria-label={social.name}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Icon size={20} />
                </a>
              );
            })}
          </div>
        </div>

        {/* ─── CENTER: Nav Links (column) ─── */}
        <ul className={styles.footerLinks}>
          {links.map((link) => (
            <li key={link.name}>
              <Link href={link.href} className={styles.footerLink}>
                {link.name}
              </Link>
            </li>
          ))}
        </ul>

        {/* ─── RIGHT: Studio Logo ─── */}
        <div className={styles.right}>
          <div className={styles.logoWrapper}>
            <Image
              src="/images/studio-logo.png" 
              alt="Corus Studio Logo"
              width={80}
              height={80}
              className={styles.studioLogo}
            />
          </div>
        </div>
      </div>

      {/* ─── BOTTOM: Copyright (full width) ─── */}
      <div className={styles.copyrightWrapper}>
        <p className={styles.copyright}>
          &copy; Team PFC 2026 | Built By Team PFC
        </p>
      </div>
    </footer>
  );
}