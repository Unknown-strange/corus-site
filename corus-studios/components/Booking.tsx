"use client";

import { useState, useRef, useEffect } from "react";
import Image from "next/image";
import styles from "./Booking.module.css";

const packages = [
  {
    id: 1,
    price: "GH₵100",
    description: "2 retouched pictures",
  },
  {
    id: 2,
    price: "GH₵150",
    description: "5 retouched pictures",
  },
  {
    id: 3,
    price: "GH₵250",
    description: "10 retouched pictures",
  },
];

export default function Booking() {
  const [selectedPackage, setSelectedPackage] = useState(1);
  const sectionRef = useRef<HTMLElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.unobserve(entry.target);
        }
      },
      { threshold: 0.2 } // trigger when 20% of section is visible
    );

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    return () => {
      if (sectionRef.current) {
        observer.unobserve(sectionRef.current);
      }
    };
  }, []);

  return (
    <section
      ref={sectionRef}
      className={`${styles.bookingSection} ${isVisible ? styles.visible : ""}`}
      id="booking"
    >
      {/* Left decorative image */}
      <div className={`${styles.imageLeft} ${isVisible ? styles.imageVisible : ""}`}>
        <Image
          src="/images/booking-left.png"   // ← replace with your image path
          alt="Decorative left"
          fill
          className={styles.image}
        />
      </div>

      {/* Right decorative image */}
      <div className={`${styles.imageRight} ${isVisible ? styles.imageVisible : ""}`}>
        <Image
          src="/images/booking-right.png"  // ← replace with your image path
          alt="Decorative right"
          fill
          className={styles.image}
        />
      </div>

      <h2>Book a Session Today</h2>

      <form className={styles.form}>
        {/* Full Name */}
        <input type="text" placeholder="Full Name" required />

        {/* Phone + Photoshoot */}
        <div className={styles.row}>
          <div className={styles.phoneGroup}>
            <span>+233</span>
            <input type="tel" placeholder="Phone Number" required />
          </div>
          <select required defaultValue="">
            <option value="" disabled hidden>
              Kind of Photoshoot
            </option>
            <option>Birthday</option>
            <option>Graduation</option>
            <option>Matriculation</option>
            <option>Agenda</option>
            <option>Wedding</option>
          </select>
        </div>

        {/* Date */}
        <input type="date" required placeholder="Select a date" />

        {/* Time */}
        <select required defaultValue="">
          <option value="" disabled hidden>
            Choose booking time
          </option>
          <option>08:00 AM</option>
          <option>09:00 AM</option>
          <option>10:00 AM</option>
          <option>11:00 AM</option>
          <option>12:00 PM</option>
          <option>01:00 PM</option>
          <option>02:00 PM</option>
          <option>03:00 PM</option>
          <option>04:00 PM</option>
        </select>

        {/* Packages */}
        <div className={styles.packageContainer}>
          {packages.map((pkg) => (
            <div
              key={pkg.id}
              onClick={() => setSelectedPackage(pkg.id)}
              className={`${styles.packageCard} ${
                selectedPackage === pkg.id ? styles.active : ""
              }`}
            >
              <h3>{pkg.price}</h3>
              <p>{pkg.description}</p>
            </div>
          ))}
        </div>

        {/* Submit */}
        <button type="submit">Book</button>
      </form>
    </section>
  );
}