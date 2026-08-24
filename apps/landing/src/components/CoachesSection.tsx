import Image from "next/image";
import { Trophy, Languages } from "lucide-react";
import { coaches, type Coach } from "../data/content";
import styles from "./CoachesSection.module.css";

function CoachCard({ coach, decorative }: { coach: Coach; decorative?: boolean }) {
  return (
    <div className={styles.card} aria-hidden={decorative || undefined}>
      <div className={styles.photoWrap}>
        <Image
          src={coach.photo}
          alt={decorative ? "" : `${coach.name} — shaxmat murabbiyi`}
          fill
          sizes="236px"
          style={{ objectFit: "cover" }}
        />
      </div>
      <div className={styles.body}>
        <h3 className={styles.name}>{coach.name}</h3>
        <div className={styles.titleBadge}><Trophy size={12} aria-hidden="true" /> {coach.title}</div>
        <p className={styles.exp}>{coach.experience}</p>
        <div className={styles.spacer} />
        <div className={styles.langs}>
          <Languages size={15} color="#F59E0B" aria-hidden="true" />
          <span className={styles.langText}>{coach.languages}</span>
        </div>
      </div>
    </div>
  );
}

/** Cheksiz aylanuvchi lenta — sof CSS animatsiyasi (JS shart emas).
 *  Ro'yxat vizual uzluksizlik uchun ikki marta chiziladi, lekin ikkinchi
 *  nusxa skrin-rider uchun `aria-hidden` bilan yashiriladi (bir xil
 *  ma'lumot ikki marta o'qilmasligi uchun). */
export function CoachesSection() {
  return (
    <section id="murabbiylar" className={styles.section} aria-labelledby="murabbiylar-heading">
      <div className={`${styles.head} reveal`}>
        <div className={styles.eyebrow}>MURABBIYLAR</div>
        <h2 id="murabbiylar-heading" className={styles.heading}>Farzandingizga saboq beradigan xalqaro ustozlar</h2>
      </div>

      <div className={styles.marqueeRow}>
        <div className={styles.marqueeTrack}>
          {coaches.map((c) => <CoachCard key={c.name} coach={c} />)}
          {coaches.map((c) => <CoachCard key={`${c.name}-dup`} coach={c} decorative />)}
        </div>
      </div>
    </section>
  );
}
