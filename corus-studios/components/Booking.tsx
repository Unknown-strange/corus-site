"use client";

import { useState } from "react";
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

  return (
    <section className={styles.bookingSection} id="booking">

      <h2>Book a Session Today</h2>

      <form className={styles.form}>

        {/* Full Name */}

        <input
          type="text"
          placeholder="Full Name"
          required
        />

        {/* Phone + Photoshoot */}

        <div className={styles.row}>

          <div className={styles.phoneGroup}>
            <span>+233</span>

            <input
              type="tel"
              placeholder="Phone Number"
              required
              color="#888888"
            />
          </div>

          <select required>
            <option>Birthday</option>
            <option>Graduation</option>
            <option>Matriculation</option>
            <option>Agenda</option>
            <option>Wedding</option>
          </select>

        </div>

        {/* Date */}

        <input
          type="date"
          required
        />

        {/* Time */}

        <select required>

          <option>Choose booking time</option>

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

        <button type="submit">
          Book
        </button>

      </form>

    </section>
  );
}