import { Crown } from "lucide-react";
import { LeadCtaButton } from "./LeadCtaButton";
import styles from "./Header.module.css";

const NAV_LINKS = [
  { href: "#nega", label: "Nega shaxmat?" },
  { href: "#platforma", label: "Platforma" },
  { href: "#murabbiylar", label: "Murabbiylar" },
  { href: "#dars", label: "Sinov darsi" },
  { href: "#savol", label: "Savollar" },
];

export function Header() {
  return (
    <header className={styles.nav}>
      <div className={styles.inner}>
        <a href="#top" className={styles.logo}>
          <span className={styles.mark}>
            <span className={styles.markDot} aria-hidden="true" />
            <Crown size={17} color="#fff" aria-hidden="true" />
          </span>
          <span className={styles.wordmark}>Chesson</span>
        </a>

        <nav className={styles.links} aria-label="Asosiy navigatsiya">
          {NAV_LINKS.map((l) => (
            <a key={l.href} href={l.href}>{l.label}</a>
          ))}
        </nav>

        <LeadCtaButton className={styles.cta}>Bepul dars</LeadCtaButton>
      </div>
    </header>
  );
}
