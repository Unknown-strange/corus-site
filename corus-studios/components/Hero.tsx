"use client";

import Image from "next/image";
import { useRouter } from "next/navigation"; // ← import router
import { Swiper, SwiperSlide } from "swiper/react";
import { Pagination, Autoplay } from "swiper/modules";
import styles from "./Hero.module.css";

import "swiper/css";
import "swiper/css/pagination";

const slides = [
  {
    id: 1,
    title: "PHOTO-\nSHOOTS",
    description: "Are you looking for a studio or gadgets to rent?",
    image: "/images/hero4.png",
  },
  {
    id: 2,
    title: "STUDIO\nRENTALS",
    description: "Affordable studio space for professionals and creators.",
    image: "/images/hero5.png",
    textColor: "#fff",
  },
  {
    id: 3,
    title: "MAKE\nMEMORIES",
    description: "Book your photography session with Corus Studio today.",
    image: "/images/hero6.png",
    textColor: "#fff", 
  },
];

export default function Hero() {
  const router = useRouter(); // ← use router

  const handleBookNow = () => {
    router.push("/#booking");
  };

  return (
    <section className={styles.heroSection}>
      <Swiper
        modules={[Pagination, Autoplay]}
        pagination={{ clickable: true }}
        autoplay={{
          delay: 5000,
          disableOnInteraction: false,
        }}
        loop
      >
        {slides.map((slide) => (
          <SwiperSlide key={slide.id}>
            <div className={styles.slideContainer}>
              <Image
                src={slide.image}
                alt={slide.title}
                fill
                priority
                className={styles.backgroundImage}
              />

              <div className={styles.content}>
                <div 
                  className={styles.title}
                  style={{ color: slide.textColor || "black" }}
                >
                  {slide.title}
                </div>
                <p 
                  className={styles.description}
                  style={{ color: slide.textColor || "white" }}
                >
                  {slide.description}
                </p>
                <button  // ← back to <button>
                  className={styles.button}
                  onClick={handleBookNow}  // ← click handler
                  style={{ 
                    backgroundColor: slide.textColor ? "#ea580c" : "#ea580c",
                    color: slide.textColor || "white"
                  }}
                >
                  Book Now
                </button>
              </div>
            </div>
          </SwiperSlide>
        ))}
      </Swiper>
    </section>
  );
}