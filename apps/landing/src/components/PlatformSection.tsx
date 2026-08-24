"use client";

import { useId, useState } from "react";
import Image from "next/image";
import { LayoutDashboard, Swords, Trophy, UserRound, Check } from "lucide-react";
import { platformTabs } from "../data/content";
import styles from "./PlatformSection.module.css";

const ICONS = { "layout-dashboard": LayoutDashboard, swords: Swords, trophy: Trophy, "user-round": UserRound };

export function PlatformSection() {
  const [activeTab, setActiveTab] = useState(0);
  const active = platformTabs[activeTab];
  const ActiveIcon = ICONS[active.icon];
  const panelId = useId();

  return (
    <section id="platforma" className={styles.section} aria-labelledby="platforma-heading">
      <div className={`${styles.head} reveal`}>
        <div className={styles.eyebrow}>BIZNING PLATFORMA</div>
        <h2 id="platforma-heading" className={styles.heading}>O&apos;quvchi uchun to&apos;liq onlayn muhit</h2>
        <p className={styles.sub}>Chesson — bu shunchaki dars emas. Bola o&apos;ynaydi, mashq qiladi, reytingda ko&apos;tariladi va o&apos;z o&apos;sishini kuzatib boradi.</p>
      </div>

      <div className={styles.tabs} role="tablist" aria-label="Platforma bo'limlari">
        {platformTabs.map((t, i) => {
          const Icon = ICONS[t.icon];
          const isActive = i === activeTab;
          return (
            <button
              key={t.label}
              type="button"
              role="tab"
              id={`${panelId}-tab-${i}`}
              aria-selected={isActive}
              aria-controls={`${panelId}-panel`}
              className={`${styles.tab} ${isActive ? styles.tabActive : ""}`}
              onClick={() => setActiveTab(i)}
            >
              <Icon size={17} aria-hidden="true" /> {t.label}
            </button>
          );
        })}
      </div>

      <div
        className={`${styles.panel} reveal`}
        role="tabpanel"
        id={`${panelId}-panel`}
        aria-labelledby={`${panelId}-tab-${activeTab}`}
      >
        <div>
          <span className={styles.chip}><ActiveIcon size={15} aria-hidden="true" /> {active.label}</span>
          <h3 className={styles.panelTitle}>{active.title}</h3>
          <p className={styles.panelDesc}>{active.desc}</p>
          <ul className={styles.points}>
            {active.points.map((p) => (
              <li key={p} className={styles.pointItem}>
                <Check size={17} className={styles.pointIcon} aria-hidden="true" />
                {p}
              </li>
            ))}
          </ul>
        </div>

        <div className={styles.shotFrame}>
          <div className={styles.shotChrome}>
            <span className={styles.shotDot} style={{ background: "#F87171" }} />
            <span className={styles.shotDot} style={{ background: "#FBBF24" }} />
            <span className={styles.shotDot} style={{ background: "#34D399" }} />
          </div>
          <div className={styles.shotImgWrap}>
            <Image
              key={active.shot}
              src={active.shot}
              alt={`Chesson platformasi — ${active.label}`}
              fill
              sizes="(max-width: 820px) 90vw, 55vw"
              style={{ objectFit: "cover", objectPosition: "top" }}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
