import Image from "next/image";
import styles from "./AuthShell.module.css";

const MOSAIC = [
  { src: "/gallery/Aunt Vida.jpg", priority: true },
  { src: "/gallery/1.png", priority: true },
  { src: "/gallery/4.png", priority: false },
  { src: "/gallery/5.png", priority: false },
  { src: "/gallery/9.png", priority: false },
  { src: "/gallery/10.png", priority: false },
];

export default function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <div className={styles.screen}>
      <div className={styles.frame}>
        {/* ─── Mobile mosaic (horizontal strip) ─── */}
        <div className={styles.mobileMosaic} aria-hidden="true">
          {MOSAIC.map((shot) => (
            <div key={shot.src} className={styles.mobileShot}>
              <Image
                src={shot.src}
                alt=""
                fill
                className={styles.mobileShotImage}
                priority={shot.priority}
              />
            </div>
          ))}
        </div>

        {/* ─── Desktop mosaic (absolute positioned) ─── */}
        <div className={styles.desktopMosaic} aria-hidden="true">
          {MOSAIC.map((shot, index) => {
            // Desktop coordinates (from design)
            const positions = [
              { left: 0, top: 0, width: 283, height: 321 },
              { left: 294, top: 0, width: 283, height: 487 },
              { left: 0, top: 331, width: 283, height: 397 },
              { left: 294, top: 498, width: 283, height: 397 },
              { left: 3, top: 741, width: 280, height: 321 },
              { left: 294, top: 902, width: 283, height: 160 },
            ];
            const pos = positions[index];
            return (
              <div
                key={shot.src}
                className={styles.desktopShot}
                style={
                  {
                    "--l": pos.left,
                    "--t": pos.top,
                    "--w": pos.width,
                    "--h": pos.height,
                  } as React.CSSProperties
                }
              >
                <Image
                  src={shot.src}
                  alt=""
                  fill
                  className={styles.desktopShotImage}
                  priority={shot.priority}
                />
              </div>
            );
          })}
        </div>

        {/* ─── Form panel ─── */}
        <div className={styles.panel}>{children}</div>
      </div>
    </div>
  );
}