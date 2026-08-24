import styles from "./TrialStepsSection.module.css";

const CHECKER_PATTERN = [true, false, true, false, false, true, false, true, true, false, true, false, false, true, false, true];

const STEPS = [
  { time: "0–10 DAQIQA", title: "Baholash", text: "Murabbiy bolaning shaxmat bilimi va fikrlash tezligini bir necha savol orqali aniqlaydi." },
  { time: "10–25 DAQIQA", title: "O'yin sessiyasi", text: "Bola murabbiy bilan jonli partiya o'ynaydi — qiziqishi va kuchli tomonlari ochiladi." },
  { time: "25–30 DAQIQA", title: "Shaxsiy yo'riqnoma", text: "Ota-onaga aniq tavsiyalar: bolaning darajasi, o'sish rejasi va mos guruh.", feature: true },
];

export function TrialStepsSection() {
  return (
    <section id="dars" className={styles.section} aria-labelledby="dars-heading">
      <div className={`${styles.head} reveal`}>
        <div className={styles.eyebrow}>30 DAQIQADA NIMA BO&apos;LADI?</div>
        <h2 id="dars-heading" className={styles.heading}>Bepul diagnostik dars — 3 bosqich</h2>
        <p className={styles.sub}>Hech qanday majburiyatsiz. Farzandingizning darajasini aniqlaymiz va aniq yo&apos;l xaritasini beramiz.</p>
      </div>

      <div className={styles.wrap}>
        <div className={styles.dashLine} aria-hidden="true" />
        <ol className={styles.grid} style={{ listStyle: "none", padding: 0, margin: 0 }}>
          {STEPS.map((s, i) => (
            <li key={s.title} className={`${styles.card} ${s.feature ? styles.cardFeature : ""} reveal`}>
              <div className={`${styles.checker} ${s.feature ? styles.checkerFeature : ""}`} aria-hidden="true">
                {CHECKER_PATTERN.map((on, ci) => (
                  <div key={ci} className={on ? styles.checkerCell : undefined} />
                ))}
              </div>
              <span className={`${styles.numBadge} ${s.feature ? styles.numBadgeAccent : ""}`} aria-hidden="true">{i + 1}</span>
              <div className={styles.timeLabel}>{s.time}</div>
              <h3 className={styles.cardTitle}>{s.title}</h3>
              <p className={styles.cardText}>{s.text}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
