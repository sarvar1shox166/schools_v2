import type { Metadata, Viewport } from "next";
import { Manrope, Inter, JetBrains_Mono } from "next/font/google";
import { faqs } from "../data/content";
import "./globals.css";

const manrope = Manrope({
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
  variable: "--font-manrope",
  display: "swap",
});
const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-inter",
  display: "swap",
});
const jbMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["500", "700"],
  variable: "--font-jbmono",
  display: "swap",
});

const SITE_URL = "https://chesson.uz";
const SITE_NAME = "Chesson";
const DESCRIPTION =
  "Farzandingiz uchun onlayn shaxmat maktabi. Sertifikatli murabbiylar, interaktiv platforma va bepul sinov darsi — mantiq, diqqat va strategik fikrlashni rivojlantiring.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${SITE_NAME} — Bolalar uchun onlayn shaxmat maktabi`,
    template: `%s — ${SITE_NAME}`,
  },
  description: DESCRIPTION,
  keywords: [
    "shaxmat maktabi", "bolalar uchun shaxmat", "onlayn shaxmat darslari",
    "shaxmat murabbiyi", "Toshkent shaxmat", "chess school Uzbekistan",
  ],
  authors: [{ name: SITE_NAME }],
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: "uz_UZ",
    url: SITE_URL,
    siteName: SITE_NAME,
    title: `${SITE_NAME} — Bolalar uchun onlayn shaxmat maktabi`,
    description: DESCRIPTION,
    images: [{ url: "/images/app-bosh-sahifa.png", width: 1200, height: 630, alt: "Chesson platformasi" }],
  },
  twitter: {
    card: "summary_large_image",
    title: `${SITE_NAME} — Bolalar uchun onlayn shaxmat maktabi`,
    description: DESCRIPTION,
    images: ["/images/app-bosh-sahifa.png"],
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#2563eb",
};

const orgJsonLd = {
  "@context": "https://schema.org",
  "@type": "EducationalOrganization",
  name: SITE_NAME,
  url: SITE_URL,
  description: DESCRIPTION,
  areaServed: "UZ",
  address: { "@type": "PostalAddress", addressLocality: "Toshkent", addressCountry: "UZ" },
};

// Google qidiruv natijalarida FAQ rich-snippet sifatida chiqishi mumkin.
const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: faqs.map((f) => ({
    "@type": "Question",
    name: f.q,
    acceptedAnswer: { "@type": "Answer", text: f.a },
  })),
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="uz" className={`${manrope.variable} ${inter.variable} ${jbMono.variable}`}>
      <head>
        <script
          type="application/ld+json"
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{ __html: JSON.stringify(orgJsonLd) }}
        />
        <script
          type="application/ld+json"
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
