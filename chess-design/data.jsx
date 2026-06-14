// data.jsx — mock data for Shaxmat Online admin
const AV_COLORS = [
  "linear-gradient(140deg,#6366f1,#8b5cf6)",
  "linear-gradient(140deg,#0ea5a4,#14b8a6)",
  "linear-gradient(140deg,#f59e0b,#f97316)",
  "linear-gradient(140deg,#ec4899,#f43f5e)",
  "linear-gradient(140deg,#3b82f6,#06b6d4)",
  "linear-gradient(140deg,#10b981,#84cc16)",
  "linear-gradient(140deg,#8b5cf6,#d946ef)",
  "linear-gradient(140deg,#0891b2,#0ea5e9)",
  "linear-gradient(140deg,#e11d48,#fb7185)",
  "linear-gradient(140deg,#7c3aed,#6366f1)",
];
function avColor(seed) {
  let h = 0; for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0;
  return AV_COLORS[Math.abs(h) % AV_COLORS.length];
}
function initials(name) {
  const p = name.trim().split(/\s+/);
  return ((p[0]?.[0] || "") + (p[1]?.[0] || "")).toUpperCase();
}

const TEACHERS = [
  { id: 1, name: "Alisher Karimov", spec: "Debyut nazariyasi", title: "FIDE Master", groups: 3, students: 34, rating: 4.9, exp: "8 yil", phone: "+998 90 123 45 67", joined: "2019" },
  { id: 2, name: "Malika Yusupova", spec: "Taktika & kombinatsiya", title: "Milliy usta", groups: 2, students: 22, rating: 4.8, exp: "5 yil", phone: "+998 91 234 56 78", joined: "2021" },
  { id: 3, name: "Bobur Rahimov", spec: "Bolalar bilan ishlash", title: "Trener", groups: 3, students: 41, rating: 5.0, exp: "6 yil", phone: "+998 93 345 67 89", joined: "2020" },
  { id: 4, name: "Sardor Nazarov", spec: "Endshpil ustasi", title: "Grossmeyster", groups: 1, students: 9, rating: 4.9, exp: "12 yil", phone: "+998 94 456 78 90", joined: "2018" },
  { id: 5, name: "Dilnoza Ergasheva", spec: "Pozitsion o'yin", title: "FIDE Master", groups: 2, students: 26, rating: 4.7, exp: "4 yil", phone: "+998 95 567 89 01", joined: "2022" },
  { id: 6, name: "Jasur Tursunov", spec: "Blitz & rapid", title: "Milliy usta", groups: 2, students: 19, rating: 4.6, exp: "5 yil", phone: "+998 97 678 90 12", joined: "2021" },
  { id: 7, name: "Nigora Saidova", spec: "Boshlang'ich tayyorgarlik", title: "Trener", groups: 3, students: 38, rating: 4.9, exp: "7 yil", phone: "+998 99 789 01 23", joined: "2019" },
  { id: 8, name: "Rustam Aliyev", spec: "Turnir tayyorgarligi", title: "Grossmeyster", groups: 1, students: 7, rating: 5.0, exp: "15 yil", phone: "+998 90 890 12 34", joined: "2017" },
];

const LEVELS = ["Boshlang'ich", "4-razryad", "3-razryad", "2-razryad", "1-razryad", "Nomzod"];
const GROUPS = [
  { id: "A", name: "Boshlang'ich — A", level: "Boshlang'ich", teacher: "Nigora Saidova", days: "Du · Chor · Ju", time: "09:00", count: 12, cap: 14, room: "1-zal", color: "#6366f1" },
  { id: "B", name: "Taktika — B", level: "3-razryad", teacher: "Malika Yusupova", days: "Se · Pay · Sha", time: "11:00", count: 8, cap: 12, room: "2-zal", color: "#14b8a6" },
  { id: "C", name: "Bolalar kursi — C", level: "Boshlang'ich", teacher: "Bobur Rahimov", days: "Du · Chor · Ju", time: "14:00", count: 15, cap: 16, room: "1-zal", color: "#f59e0b" },
  { id: "D", name: "Pozitsion — D", level: "2-razryad", teacher: "Dilnoza Ergasheva", days: "Se · Pay", time: "16:00", count: 10, cap: 12, room: "3-zal", color: "#ec4899" },
  { id: "E", name: "Pro Trening", level: "Nomzod", teacher: "Sardor Nazarov", days: "Sha · Yak", time: "10:00", count: 6, cap: 8, room: "VIP-zal", color: "#0ea5e9" },
  { id: "F", name: "Blitz klub — F", level: "1-razryad", teacher: "Jasur Tursunov", days: "Pay · Sha", time: "18:00", count: 11, cap: 14, room: "2-zal", color: "#10b981" },
];

function mkStudent(id, name, group, level, status, pay, phone, age, joined) {
  return { id, name, group, level, status, pay, phone, age, joined };
}
const STUDENTS = [
  mkStudent(1, "Asilbek Komilov", "A", "Boshlang'ich", "yangi", "kutilmoqda", "+998 90 111 22 33", 9, "Bugun"),
  mkStudent(2, "Malika Rashidova", "B", "3-razryad", "yangi", "to'langan", "+998 91 444 55 66", 13, "Kecha"),
  mkStudent(3, "Bobur Nazarov", "C", "Boshlang'ich", "faol", "qarzdor", "+998 93 777 88 99", 8, "12 May"),
  mkStudent(4, "Sarvar Yo'ldoshev", "F", "1-razryad", "faol", "to'langan", "+998 99 222 33 44", 16, "3 Apr"),
  mkStudent(5, "Gulnoza Tosheva", "A", "Boshlang'ich", "faol", "to'langan", "+998 90 333 44 55", 10, "20 Fev"),
  mkStudent(6, "Javohir Saidov", "D", "2-razryad", "faol", "to'langan", "+998 91 555 66 77", 14, "8 Yan"),
  mkStudent(7, "Madina Aliyeva", "B", "3-razryad", "faol", "qarzdor", "+998 93 888 99 00", 12, "15 Mar"),
  mkStudent(8, "Diyor Karimov", "E", "Nomzod", "faol", "to'langan", "+998 94 666 77 88", 17, "1 Sen 2024"),
  mkStudent(9, "Sevara Mirzayeva", "C", "Boshlang'ich", "yangi", "kutilmoqda", "+998 95 999 00 11", 7, "Bugun"),
  mkStudent(10, "Otabek Rahimov", "F", "1-razryad", "faol", "to'langan", "+998 97 222 11 00", 15, "22 Dek 2024"),
  mkStudent(11, "Laylo Ismoilova", "A", "Boshlang'ich", "faol", "to'langan", "+998 99 333 22 11", 9, "5 Iyun"),
  mkStudent(12, "Aziz Tojiboyev", "D", "2-razryad", "nofaol", "qarzdor", "+998 90 444 33 22", 13, "18 Noy 2024"),
  mkStudent(13, "Kamola Yusupova", "B", "4-razryad", "faol", "to'langan", "+998 91 666 55 44", 11, "30 Mar"),
  mkStudent(14, "Ulug'bek Hamidov", "E", "Nomzod", "faol", "to'langan", "+998 93 777 66 55", 16, "12 Okt 2024"),
  mkStudent(15, "Shaxzoda Qodirova", "C", "Boshlang'ich", "faol", "kutilmoqda", "+998 94 888 77 66", 8, "2 Apr"),
  mkStudent(16, "Nodirbek Eshonov", "F", "1-razryad", "faol", "to'langan", "+998 95 111 99 88", 14, "9 Yan"),
];

const APPLICATIONS = [
  { id: 1, name: "Asilbek Komilov", phone: "+998 90 111 22 33", when: "Bugun 10:24", status: "yangi", note: "Boshlang'ich guruh" },
  { id: 2, name: "Malika Rashidova", phone: "+998 91 444 55 66", when: "Kecha 18:05", status: "yangi", note: "Taktika kursi" },
  { id: 3, name: "Bobur Nazarov", phone: "+998 93 777 88 99", when: "Kecha 14:30", status: "qongiroq", note: "Bolalar kursi" },
  { id: 4, name: "Sarvar Yo'ldoshev", phone: "+998 99 222 33 44", when: "2 kun oldin", status: "faol", note: "Ro'yxatdan o'tdi" },
];

const TODAY_LESSONS = [
  { time: "09:00", title: "Boshlang'ich — A guruh", teacher: "Alisher K.", count: 12, tone: "accent", room: "1-zal" },
  { time: "11:00", title: "Taktika — B guruh", teacher: "Malika Y.", count: 8, tone: "success", room: "2-zal" },
  { time: "14:00", title: "Bolalar kursi — C guruh", teacher: "Bobur R.", count: 15, tone: "warn", room: "1-zal" },
  { time: "16:00", title: "Pozitsion — D guruh", teacher: "Dilnoza E.", count: 10, tone: "info", room: "3-zal" },
  { time: "18:00", title: "Blitz klub — F guruh", teacher: "Jasur T.", count: 11, tone: "accent", room: "2-zal" },
];

const GROWTH = [
  { m: "Yanvar", v: 180 }, { m: "Fevral", v: 192 }, { m: "Mart", v: 210 },
  { m: "Aprel", v: 221 }, { m: "May", v: 236 }, { m: "Iyun", v: 248 },
];

const PAYMENTS = [
  { id: "TXN-1042", name: "Sarvar Yo'ldoshev", group: "F", amount: 450000, date: "06.06.2026", method: "Click", status: "to'langan" },
  { id: "TXN-1041", name: "Malika Rashidova", group: "B", amount: 500000, date: "05.06.2026", method: "Payme", status: "to'langan" },
  { id: "TXN-1040", name: "Bobur Nazarov", group: "C", amount: 400000, date: "—", method: "Naqd", status: "qarzdor" },
  { id: "TXN-1039", name: "Gulnoza Tosheva", group: "A", amount: 400000, date: "04.06.2026", method: "Uzcard", status: "to'langan" },
  { id: "TXN-1038", name: "Madina Aliyeva", group: "B", amount: 500000, date: "—", method: "Naqd", status: "qarzdor" },
  { id: "TXN-1037", name: "Javohir Saidov", group: "D", amount: 550000, date: "03.06.2026", method: "Payme", status: "to'langan" },
  { id: "TXN-1036", name: "Aziz Tojiboyev", group: "D", amount: 550000, date: "—", method: "Naqd", status: "qarzdor" },
  { id: "TXN-1035", name: "Diyor Karimov", group: "E", amount: 750000, date: "02.06.2026", method: "Click", status: "to'langan" },
  { id: "TXN-1034", name: "Laylo Ismoilova", group: "A", amount: 400000, date: "01.06.2026", method: "Uzcard", status: "to'langan" },
];

const INCOME_MONTHS = [
  { m: "Yan", v: 12.8 }, { m: "Fev", v: 13.5 }, { m: "Mar", v: 15.1 },
  { m: "Apr", v: 16.0 }, { m: "May", v: 17.2 }, { m: "Iyun", v: 18.4 },
];
const INCOME_SPLIT = [
  { nm: "Guruh darslari", v: 11.2, c: "#6366f1" },
  { nm: "Individual trening", v: 4.6, c: "#14b8a6" },
  { nm: "Turnir & to'garaklar", v: 1.8, c: "#f59e0b" },
  { nm: "Boshqa", v: 0.8, c: "#ec4899" },
];

const NOTIFS = [
  { id: 1, type: "ariza", icon: "user", title: "Yangi ariza qabul qilindi", body: "Asilbek Komilov boshlang'ich guruhga yozildi", when: "5 daqiqa oldin", unread: true },
  { id: 2, type: "tolov", icon: "payments", title: "To'lov qabul qilindi", body: "Sarvar Yo'ldoshev — 450 000 so'm (Click)", when: "32 daqiqa oldin", unread: true },
  { id: 3, type: "ogoh", icon: "alert", title: "To'lov muddati o'tdi", body: "Bobur Nazarov 5 kundan beri qarzdor", when: "1 soat oldin", unread: true },
  { id: 4, type: "davomat", icon: "attendance", title: "Davomat belgilandi", body: "Taktika — B guruh · 8 dan 7 o'quvchi keldi", when: "2 soat oldin", unread: false },
  { id: 5, type: "dars", icon: "calendar", title: "Dars eslatmasi", body: "Pro Trening — Individual bugun 16:00 da", when: "3 soat oldin", unread: false },
  { id: 6, type: "tolov", icon: "income", title: "Oylik hisobot tayyor", body: "May oyi daromad hisoboti yaratildi", when: "Kecha", unread: false },
];

// weekly schedule: rows = time slots, cols = 6 days
const SCHED_DAYS = ["Du", "Se", "Chor", "Pay", "Ju", "Sha"];
const SCHED_TIMES = ["09:00", "11:00", "14:00", "16:00", "18:00"];
// map[time][dayIndex] = lesson or null
const SCHEDULE = {
  "09:00": [{ t: "Boshlang'ich A", s: "Nigora S." }, null, { t: "Boshlang'ich A", s: "Nigora S." }, null, { t: "Boshlang'ich A", s: "Nigora S." }, { t: "Pro Trening", s: "Sardor N." }],
  "11:00": [null, { t: "Taktika B", s: "Malika Y." }, null, { t: "Taktika B", s: "Malika Y." }, null, { t: "Taktika B", s: "Malika Y." }],
  "14:00": [{ t: "Bolalar C", s: "Bobur R." }, null, { t: "Bolalar C", s: "Bobur R." }, null, { t: "Bolalar C", s: "Bobur R." }, null],
  "16:00": [null, { t: "Pozitsion D", s: "Dilnoza E." }, null, { t: "Pozitsion D", s: "Dilnoza E." }, null, null],
  "18:00": [null, null, null, { t: "Blitz F", s: "Jasur T." }, null, { t: "Blitz F", s: "Jasur T." }],
};

// attendance: students x last 8 sessions, 'p' present 'a' absent 'l' late 'n' n/a
const ATT_DATES = ["12.05", "14.05", "16.05", "19.05", "21.05", "23.05", "26.05", "28.05"];
function attRow() {
  const opts = ["p", "p", "p", "p", "p", "a", "l", "p"];
  return ATT_DATES.map(() => opts[Math.floor(Math.random() * opts.length)]);
}
const ATTENDANCE = STUDENTS.slice(0, 10).map(s => ({ name: s.name, group: s.group, marks: attRow() }));

function fmtSom(n) { return n.toLocaleString("ru-RU").replace(/,/g, " "); }

window.DATA = {
  TEACHERS, STUDENTS, GROUPS, LEVELS, APPLICATIONS, TODAY_LESSONS, GROWTH,
  PAYMENTS, INCOME_MONTHS, INCOME_SPLIT, NOTIFS, SCHED_DAYS, SCHED_TIMES,
  SCHEDULE, ATT_DATES, ATTENDANCE,
};
window.avColor = avColor;
window.initials = initials;
window.fmtSom = fmtSom;
