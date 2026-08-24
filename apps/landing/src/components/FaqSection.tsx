import { Plus } from "lucide-react";
import { faqs } from "../data/content";
import styles from "./FaqSection.module.css";

/** `<details>`/`<summary>` — hech qanday JS'siz to'liq klaviatura va
 *  skrin-rider bilan ishlaydigan accordion (native brauzer semantikasi). */
export function FaqSection() {
  return (
    <section id="savol" className={styles.section} aria-labelledby="savol-heading">
      <div className={`${styles.head} reveal`}>
        <div className={styles.eyebrow}>SAVOL-JAVOB</div>
        <h2 id="savol-heading" className={styles.heading}>Ko&apos;p beriladigan savollar</h2>
      </div>

      <div className={styles.list}>
        {faqs.map((f) => (
          <details key={f.q} className={`${styles.item} reveal`}>
            <summary className={styles.summary}>
              {f.q}
              <Plus size={20} className={styles.icon} aria-hidden="true" />
            </summary>
            <p className={styles.answer}>{f.a}</p>
          </details>
        ))}
      </div>
    </section>
  );
}
