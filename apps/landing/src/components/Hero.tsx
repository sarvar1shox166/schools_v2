import { Fragment } from "react";
import { ArrowRight, MonitorPlay } from "lucide-react";
import { HeroCardStack } from "./HeroCardStack";
import { LeadCtaButton } from "./LeadCtaButton";
import { heroImages, heroStats } from "../data/content";
import styles from "./Hero.module.css";

export function Hero() {
  return (
    <section className={styles.section}>
      <div>
        <div className="fade-up">
          <span className={styles.badge}>🎉 Yangi o&apos;quv yili uchun: Sentabrga 10% chegirma</span>
        </div>

        <h1 className={styles.title} style={{ animationDelay: "0.12s" }}>
          Farzandingiz uchun <span className={styles.titleAccent}>birinchi bepul</span> sinov darsi
        </h1>

        <p className={styles.lede}>
          Farzandingizda <strong>mantiq, diqqat va strategik fikrlashni</strong> rivojlantiring. Tajribali ustozlar bilan onlayn darslar.
        </p>

        <div className={styles.actions}>
          <LeadCtaButton className={styles.ctaPrimary}>
            Bepul darsga yozilish <ArrowRight size={18} aria-hidden="true" />
          </LeadCtaButton>
          <a href="#platforma" className={styles.ctaSecondary}>
            <MonitorPlay size={18} aria-hidden="true" /> Platformani ko&apos;rish
          </a>
        </div>

        <div className={styles.stats}>
          {heroStats.map((s, i) => (
            <Fragment key={s.label}>
              {i > 0 && <div className={styles.statDivider} />}
              <div>
                <div className={styles.statValue}>
                  {s.value.includes("★")
                    ? <>{s.value.replace("★", "")}<span className={styles.starAccent}>★</span></>
                    : s.value}
                </div>
                <div className={styles.statLabel}>{s.label}</div>
              </div>
            </Fragment>
          ))}
        </div>
      </div>

      <HeroCardStack images={heroImages} />
    </section>
  );
}
