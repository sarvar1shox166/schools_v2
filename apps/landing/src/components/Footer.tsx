import { Crown, Send, Camera, MessageCircle } from "lucide-react";
import { contact } from "../data/content";
import styles from "./Footer.module.css";

export function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={styles.grid}>
        <div>
          <div className={styles.brand}>
            <span className={styles.mark}>
              <span className={styles.markDot} aria-hidden="true" />
              <Crown size={16} color="#fff" aria-hidden="true" />
            </span>
            <span className={styles.wordmark}>Chesson</span>
          </div>
          <p className={styles.desc}>
            Kelajak liderlari va chempionlarini tarbiyalaydigan onlayn shaxmat platformasi. Mantiqiy fikrlash, strategik qarorlar qabul qilish va doimiy o&apos;sish muhiti.
          </p>
        </div>

        <div>
          <div className={styles.colTitle}>Platforma</div>
          <div className={styles.colLinks}>
            <a href="#platforma">Imkoniyatlar</a>
            <a href="#dars">Sinov darsi</a>
            <a href="#nega">Nega shaxmat?</a>
          </div>
        </div>

        <div>
          <div className={styles.colTitle}>Bog&apos;lanish</div>
          <div className={styles.colLinks}>
            {contact.phones.map((p) => (
              <a key={p} href={`tel:${p.replace(/[^+\d]/g, "")}`}>{p}</a>
            ))}
            <a href={`mailto:${contact.email}`}>{contact.email}</a>
            <span>{contact.address}</span>
          </div>
        </div>

        <div>
          <div className={styles.colTitle}>Ijtimoiy tarmoqlar</div>
          <div className={styles.social}>
            <a href="#" className={styles.socialLink} aria-label="Telegram"><Send size={18} aria-hidden="true" /></a>
            <a href="#" className={styles.socialLink} aria-label="Instagram"><Camera size={18} aria-hidden="true" /></a>
            <a href="#" className={styles.socialLink} aria-label="Xabar yozish"><MessageCircle size={18} aria-hidden="true" /></a>
          </div>
        </div>
      </div>

      <div className={styles.bottom}>
        <span className={styles.bottomText}>© {new Date().getFullYear()} Chesson. Barcha huquqlar himoyalangan.</span>
        <span className={styles.bottomLinks}>Maxfiylik · Shartlar</span>
      </div>
    </footer>
  );
}
