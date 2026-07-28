import Image from "next/image";
import styles from "./AuthShell.module.css";

/**
 * Left-hand photo mosaic, shared by every auth screen.
 *
 * Coordinates come from the design, normalised twice so they are relative to
 * the card rather than to the design canvas:
 *   - vertically against the topmost image (the spec starts at top: 1458px);
 *   - horizontally by 107px, the empty canvas gutter left of the first column,
 *     so the card's edge sits flush against the photos.
 *
 * The last row intentionally overflows the 1030 card height and is clipped.
 */
const MOSAIC = [
  { src: "/gallery/Aunt Vida.jpg", left: 0, top: 0, width: 283, height: 321, priority: true },
  { src: "/gallery/1.png", left: 294, top: 0, width: 283, height: 487, priority: true },
  { src: "/gallery/4.png", left: 0, top: 331, width: 283, height: 397, priority: false },
  { src: "/gallery/5.png", left: 294, top: 498, width: 283, height: 397, priority: false },
  { src: "/gallery/9.png", left: 3, top: 741, width: 280, height: 321, priority: false },
  { src: "/gallery/10.png", left: 294, top: 902, width: 283, height: 160, priority: false },
];

export default function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <div className={styles.screen}>
      <div className={styles.frame}>
        {/* Decorative portfolio imagery — conveys no information to a screen reader. */}
        <div className={styles.mosaic} aria-hidden="true">
          {MOSAIC.map((shot) => (
            <div
              key={shot.src}
              className={styles.shot}
              style={
                {
                  "--l": shot.left,
                  "--t": shot.top,
                  "--w": shot.width,
                  "--h": shot.height,
                } as React.CSSProperties
              }
            >
              <Image
                src={shot.src}
                alt=""
                fill
                sizes="(min-width: 1024px) 21vw, 0px"
                priority={shot.priority}
                className={styles.shotImage}
              />
            </div>
          ))}
        </div>

        <div className={styles.panel}>{children}</div>
      </div>
    </div>
  );
}
