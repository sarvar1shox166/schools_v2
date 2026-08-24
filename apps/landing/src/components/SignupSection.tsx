import { Flame, Check } from "lucide-react";
import { LeadForm } from "./LeadForm";
import styles from "./SignupSection.module.css";

const BENEFITS = [
  "100% bepul, majburiyatsiz",
  "Sertifikatli murabbiy bilan 1-on-1",
  "Yozma diagnostika xulosasi",
];

export function SignupSection() {
  return (
    <section id="yozilish" className={styles.section} aria-labelledby="yozilish-heading">
      <div className={`${styles.banner} reveal`}>
        <div className={styles.grid}>
          <div className={styles.copy}>
            {/* Hero bo'limidagi chegirma xabari bilan bir xil qilib qo'yildi —
                oldingi qoralamada ikki xil oy (sentabr/avgust) ko'rsatilgan edi. */}
            <div className={styles.badge}><Flame size={14} color="#FBBF24" aria-hidden="true" /> Yangi o&apos;quv yili uchun 10% chegirma</div>
            <h2 id="yozilish-heading" className={styles.title}>Bepul darsga hoziroq yoziling</h2>
            <p className={styles.sub}>Ma&apos;lumotlaringizni qoldiring — murabbiyimiz 24 soat ichida bog&apos;lanib, qulay vaqtni belgilaydi.</p>
            <ul className={styles.list}>
              {BENEFITS.map((b) => (
                <li key={b} className={styles.listItem}>
                  <span className={styles.checkBadge}><Check size={15} color="#fff" aria-hidden="true" /></span>
                  {b}
                </li>
              ))}
            </ul>
          </div>
          <div className={styles.formWrap}>
            <LeadForm />
          </div>
        </div>
      </div>
    </section>
  );
}
