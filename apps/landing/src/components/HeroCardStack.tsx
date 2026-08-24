"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Flame, Trophy } from "lucide-react";
import styles from "./HeroCardStack.module.css";

const SLOT_STYLE = [
  { transform: "translate(0,0) rotate(0deg) scale(1)", z: 3, opacity: 1, shadow: "0 30px 70px rgba(15,23,42,.18)" },
  { transform: "translate(-30px,14px) rotate(-7deg) scale(.93)", z: 2, opacity: 0.92, shadow: "0 20px 44px rgba(15,23,42,.14)" },
  { transform: "translate(30px,14px) rotate(7deg) scale(.9)", z: 1, opacity: 0.85, shadow: "0 16px 34px rgba(15,23,42,.12)" },
];

/** 3 ta ilova skrinshotini bir-birining ustida aylantirib turadi — sof
 *  bezak, shuning uchun klaviatura/skrin-rider foydalanuvchisi uchun
 *  `aria-hidden` bilan yashirilgan (matn mazmuni hero yozuvida bor). */
export function HeroCardStack({ images }: { images: string[] }) {
  const [order, setOrder] = useState([0, 1, 2]);

  useEffect(() => {
    const t = setInterval(() => {
      setOrder((o) => [o[2], o[0], o[1]]);
    }, 3600);
    return () => clearInterval(t);
  }, []);

  return (
    <div className={styles.stack} aria-hidden="true">
      {images.map((src, imgIdx) => {
        const slot = order.indexOf(imgIdx);
        const s = SLOT_STYLE[slot];
        return (
          <div
            key={src}
            className={styles.card}
            style={{ transform: s.transform, zIndex: s.z, opacity: s.opacity, boxShadow: s.shadow }}
          >
            <div className={styles.chrome}>
              <span className={`${styles.dot} ${styles.dotRed}`} />
              <span className={`${styles.dot} ${styles.dotYellow}`} />
              <span className={`${styles.dot} ${styles.dotGreen}`} />
              <span className={styles.url}>app.chesson.uz</span>
            </div>
            <div className={styles.imgWrap}>
              <Image src={src} alt="" fill sizes="(max-width: 900px) 90vw, 45vw" style={{ objectFit: "cover", objectPosition: "top" }} priority={imgIdx === 0} />
            </div>
          </div>
        );
      })}

      <div className={`${styles.float} ${styles.floatTop} float-y`}>
        <div className={styles.floatInner}>
          <span className={styles.floatIcon}><Flame size={18} color="#F59E0B" /></span>
          <div>
            <div className={styles.floatLabel}>Kunlik seriya</div>
            <div className={styles.floatValue}>12 kun</div>
          </div>
        </div>
      </div>
      <div className={`${styles.float} ${styles.floatBottom} float-y`}>
        <div className={styles.floatInner}>
          <span className={styles.floatIcon}><Trophy size={18} color="#2563EB" /></span>
          <div>
            <div className={styles.floatLabel}>Reyting</div>
            <div className={styles.floatValue}>1,240 ELO</div>
          </div>
        </div>
      </div>
    </div>
  );
}
