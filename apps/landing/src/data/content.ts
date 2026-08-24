// Ushbu fayldagi barcha matn/raqamlar Claude Design canvas qoralamasidan
// ko'chirilgan — ba'zilari HAQIQIY EMAS (namunaviy): bosh sahifadagi
// statistika (2,400+ o'quvchi, 18 murabbiy, 4.9 reyting) va murabbiylar
// bo'limidagi ism/unvon/ELO/tajriba ma'lumotlari. Nashr qilishdan oldin
// bularni haqiqiy raqamlarga almashtirish kerak.

export interface Coach {
  name: string;
  title: string; // masalan "FM · 2155 reyting" yoki "Chess On · Murabbiy"
  experience: string;
  languages: string;
  photo: string;
}

// TODO(haqiqiy ma'lumot): quyidagi 7 ta murabbiy — ism, unvon, ELO, tajriba
// — namunaviy. Haqiqiy murabbiylar ro'yxati bilan almashtirilishi kerak.
export const coaches: Coach[] = [
  { name: "Elbek Jumanov", title: "FM · 2155 reyting", experience: "7 yillik tajriba · 200+ o'quvchi tayyorlagan.", languages: "Rus · Uzb tillarida dars beradi", photo: "/images/coach-1.png" },
  { name: "Jamshidbek Aytimbetov", title: "FM · 2048 reyting", experience: "4 yillik tajriba · 300+ o'quvchi tayyorlagan.", languages: "Rus · Uzb tillarida dars beradi", photo: "/images/coach-2.png" },
  { name: "Gulchekhra Abdukholikova", title: "KMC · 1586 reyting", experience: "6 yillik tajriba · 400+ o'quvchi tayyorlagan.", languages: "Uzb tilida dars beradi", photo: "/images/coach-3.png" },
  { name: "Inomjon Shaymuratov", title: "FM · 2101 reyting", experience: "6 yillik tajriba · 500+ o'quvchi tayyorlagan.", languages: "Uzb · Rus tillarida dars beradi", photo: "/images/coach-9.png" },
  { name: "Erkinov Rustambek", title: "FM · 1927 reyting", experience: "3 yillik tajriba · 200+ o'quvchi tayyorlagan.", languages: "Uzb · Rus · Eng tillarida dars beradi", photo: "/images/coach-5.png" },
  { name: "Rano Abdukholikova", title: "KM · 1831 reyting", experience: "4 yillik tajriba · 150+ o'quvchi tayyorlagan.", languages: "Uzb tilida dars beradi", photo: "/images/coach-8.png" },
  { name: "Sanjar Eshpolatov", title: "Chess On · Murabbiy", experience: "3 yillik tajriba · 200+ o'quvchi tayyorlagan.", languages: "Uzb tilida dars beradi", photo: "/images/coach-4.png" },
];

export interface PlatformTab {
  label: string;
  icon: "layout-dashboard" | "swords" | "trophy" | "user-round";
  shot: string;
  title: string;
  desc: string;
  points: string[];
}

export const platformTabs: PlatformTab[] = [
  {
    label: "Bosh sahifa", icon: "layout-dashboard", shot: "/images/app-bosh-sahifa.png",
    title: "Boshqaruv paneli — hammasi bir joyda",
    desc: "O'quvchi tizimga kirgach o'z ko'rsatkichlarini darhol ko'radi va bugungi mashg'ulotni boshlaydi.",
    points: ["Kunlik streak, ELO reyting, XP va daraja ko'rsatkichlari", "Haftalik dars jadvali va dars krediti holati", "Bir tugma bilan o'ynash, video dars yoki masalaga o'tish"],
  },
  {
    label: "O'ynash", icon: "swords", shot: "/images/app-oynash.png",
    title: "Kompyuter va online raqiblarga qarshi o'yin",
    desc: "Bola o'rgangan bilimini amalda mustahkamlaydi — istalgan vaqt nazoratida partiya o'ynaydi.",
    points: ["Bullet, blits, rapid va klassik vaqt nazoratlari", "Online raqib qidirish va taklif yuborish", "Har bir o'yin ELO reytingga ta'sir qiladi"],
  },
  {
    label: "Reyting", icon: "trophy", shot: "/images/app-reyting.png",
    title: "Guruh reyting jadvali — sog'lom raqobat",
    desc: "O'quvchilar ELO va XP bo'yicha reytingda o'z o'rnini ko'radi, bu motivatsiyani oshiradi.",
    points: ["ELO va XP bo'yicha alohida jadvallar", "O'quvchining joriy o'rni va o'sish dinamikasi", "Butun guruh o'quvchilari ro'yxati"],
  },
  {
    label: "Profil", icon: "user-round", shot: "/images/app-profil.png",
    title: "Shaxsiy profil va o'sish tarixi",
    desc: "Bola va ota-ona o'sishni raqamlarda ko'radi — natija shaffof va o'lchanadigan.",
    points: ["ELO o'sish grafigi va so'nggi o'yinlar tarixi", "Yutuqlar, daraja va XP tajriba ko'rsatkichlari", "Yechilgan masalalar statistikasi"],
  },
];

export interface FaqItem { q: string; a: string }

export const faqs: FaqItem[] = [
  { q: "Onlayn shaxmat darsi samaralimi?", a: "Ha! Darslar shunchaki Zoomda emas, o'zimizning interaktiv platforma va Telegram-bot ekotizimida o'tiladi. O'quvchilar jonli murabbiy nazorati ostida boshqotirmalar yechadi va turnirlarda qatnashadi." },
  { q: "Necha yoshdan boshlash mumkin?", a: "Kurslarimiz 5 yoshdan 20+ yoshgacha bo'lgan o'quvchilar uchun mo'ljallangan. Kichiklarga o'yin shaklida, kattaroq va musobaqaga tayyorlanayotganlarga esa chuqurlashtirilgan strategik metodikada o'tiladi." },
  { q: "Bola shaxmatni umuman bilmasa-chi?", a: "Albatta! Birinchi darsimiz 1-ga-1 (individual) bepul diagnostika shaklida o'tiladi. Murabbiy o'quvchining nol darajasini yoki mantiqiy fikrlashini baholab, unga mos guruh va dasturni belgilaydi." },
  { q: "Darslar qancha davom etadi va qachon bo'ladi?", a: "Darslar davomiyligi va jadvali tanlangan kurs tarifiga qarab belgilanadi. O'quvchiga qulay vaqtlar ro'yxatdan o'tish jarayonida va bepul diagnostika darsida murabbiy bilan aniqlashtiriladi. Dars vaqtlarini Telegram-bot orqali doim kuzatib borishingiz mumkin." },
  { q: "Diagnostik dars rostdan ham bepulmi?", a: "Ha, 100% bepul va hech qanday majburiyatsiz. Maqsad — bolangizni tanish va sizga aniq tavsiya berish. Davom etish qarori butunlay sizniki." },
];

export const heroImages = ["/images/app-bosh-sahifa.png", "/images/hero-2.png", "/images/hero-3.png"];

// TODO(haqiqiy ma'lumot): namunaviy statistika — haqiqiy raqamlar bilan almashtirilishi kerak.
export const heroStats = [
  { value: "2,400+", label: "O'quvchilar" },
  { value: "18", label: "Sertifikatli murabbiy" },
  { value: "4.9★", label: "Ota-onalar bahosi" },
];

// TODO(haqiqiy ma'lumot): footer aloqa ma'lumotlari — tasdiqlanishi kerak.
export const contact = {
  phones: ["+998 88-102-22-62", "+998 50-760-03-00"],
  email: "admin@chesson.uz",
  address: "Toshkent, O'zbekiston",
};

export const ageOptions = [
  { value: "5-6", label: "5–6 yosh" },
  { value: "7-9", label: "7–9 yosh" },
  { value: "10-12", label: "10–12 yosh" },
  { value: "13+", label: "13+ yosh" },
];

export const dayOptions = [
  { value: "Dushanba–Chorshanba–Juma", label: "Du–Cho–Ju" },
  { value: "Seshanba–Payshanba–Shanba", label: "Se–Pa–Sha" },
  { value: "Dam olish kunlari", label: "Dam olish kunlari" },
  { value: "Har qanday", label: "Har qanday" },
];
