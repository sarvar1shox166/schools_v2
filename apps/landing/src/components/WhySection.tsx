import { Brain, Sigma, HeartHandshake } from "lucide-react";
import styles from "./WhySection.module.css";

const CARDS = [
  {
    icon: Brain,
    gradient: "linear-gradient(135deg,#3B82F6,#2563EB)",
    glow: "radial-gradient(circle,rgba(37,99,235,.28),transparent 70%)",
    title: "Diqqat va xotira",
    text: "Telefon o'yinlaridan chalg'ib, e'tiborini bir joyga jamlashni va ma'lumotlarni tezda eslab qolishni o'rganadi.",
  },
  {
    icon: Sigma,
    gradient: "linear-gradient(135deg,#3B82F6,#7C3AED)",
    glow: "radial-gradient(circle,rgba(124,58,237,.24),transparent 70%)",
    title: "Mantiq va hisob-kitob",
    text: "Har bir yurishni 3–4 qadam oldindan rejalashtirish orqali aniq fanlar va matematikaga bo'lgan qiziqishi ortadi.",
  },
  {
    icon: HeartHandshake,
    gradient: "linear-gradient(135deg,#60A5FA,#2563EB)",
    glow: "radial-gradient(circle,rgba(37,99,235,.22),transparent 70%)",
    title: "G'alaba va sabr xarakteri",
    text: "Mag'lubiyatni to'g'ri qabul qilish, mas'uliyatni o'z zimmasiga olish va qiyinchilikda shoshmaslikni shakllantiradi.",
  },
];

export function WhySection() {
  return (
    <section id="nega" className={styles.section} aria-labelledby="nega-heading">
      <div className={`${styles.head} reveal`}>
        <div className={styles.eyebrow}>NEGA SHAXMAT?</div>
        <h2 id="nega-heading" className={styles.heading}>Ekranga qaramlik o&apos;rniga — fikrlash</h2>
        <p className={styles.sub}>Befoyda telefon o&apos;yinlariga ketgan vaqtni mantiq va strategik fikrlashga yo&apos;naltiramiz.</p>
      </div>

      <div className={styles.gridWrap}>
        <svg viewBox="0 0 1200 40" preserveAspectRatio="none" className={styles.wave} aria-hidden="true">
          <path d="M0,20 C200,60 400,-20 600,20 C800,60 1000,-20 1200,20" stroke="#2563EB" strokeWidth="1.5" fill="none" />
        </svg>
        <div className={styles.grid}>
          {CARDS.map((c) => {
            const Icon = c.icon;
            return (
              <div key={c.title} className={`${styles.card} reveal`}>
                <div className={styles.glow} style={{ background: c.glow }} aria-hidden="true" />
                <span className={styles.iconBox} style={{ background: c.gradient }}>
                  <Icon size={24} color="#fff" aria-hidden="true" />
                </span>
                <h3 className={styles.cardTitle}>{c.title}</h3>
                <p className={styles.cardText}>{c.text}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
