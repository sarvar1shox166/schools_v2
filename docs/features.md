# Funksionallar — Batafsil Tavsif

## 1. Dars Krediti Tizimi

O'quvchi ma'lum miqdordagi dars uchun paket sotib oladi. Har bir tashrif kredit sarflaydi.

### Qanday ishlaydi

```
Admin → Paket tayinlash → student_packages yaratiladi
                        → total_lessons = N
                        → used_lessons = 0

Teacher → Davomat (p/a/l) → consumeLesson()
                           → used_lessons++
                           → used_lessons >= total_lessons? → status='finished', notify()

Teacher → Davomat (ae) → consumeLesson() CHAQIRILMAYDI
                       → kredit sarflanmaydi

Teacher → ae → p ga o'zgartirish → consumeLesson()  (kredit sarflanadi)
Teacher → p  → ae ga o'zgartirish → refundLesson()  (kredit qaytariladi)
```

### O'quvchi ko'rinishi

- **Dashboard** (`/student`): qisqacha "N dars qoldi" kartasi
- **Darslar** (`/student/lessons`): batafsil progress bar, ogohlantirish (≤30%)

```typescript
// queries.ts
const { data: packages } = useMyPackages()
// [{ id, totalLessons, usedLessons, status, purchasedAt, expiresAt, packageName }]

const activePkg = packages.find(p => p.status === 'active')
const remaining = activePkg ? activePkg.totalLessons - activePkg.usedLessons : null
const pct = activePkg ? Math.round((remaining / activePkg.totalLessons) * 100) : 0
```

---

## 2. XP va Gamifikatsiya Tizimi

### XP Manbalari

| Harakat | XP | Shart |
|---------|-----|-------|
| Video to'liq ko'rish | +20 | Birinchi marta (`progressPct = 100`, `!wasCompleted`) |
| Uy vazifasi bajarish | +30 (default) | Birinchi marta (teacher o'zgartirishi mumkin) |
| Puzzle yechish | Teacher belgiladi | To'g'ri javob |
| Kunlik masala | Puzzle XP | Har kun yangi masala |

### Daraja Hisoblash

```typescript
// apps/api/src/modules/gamification/xp.ts
function levelForXp(xp: number): number {
  return Math.floor(xp / 200) + 1
}

// Darajalar:
// 1-daraja: 0–199 XP
// 2-daraja: 200–399 XP
// 3-daraja: 400–599 XP
// ... va hokazo
```

### Streak

- Bugun va kecha XP olgan → `streak + 1`
- Kecha olgan, bugun ham oldi → `streak + 1`
- Kecha olmagan, bugun oldi → `streak = 1` (qayta boshlash)
- Bugun olmadi → streak o'zgarmaydi

### `awardXp()` Funksiyasi (ichki mantiq)

```typescript
// apps/api/src/modules/gamification/xp.ts
async function awardXp(client, studentId, amount) {
  // 1. Joriy XP, streak, last_xp_date ni oladi
  // 2. Streak hisoblaydi (bugun/kecha solishtiradi)
  // 3. XP += amount, yangi level = floor(xp/200)+1
  // 4. student_xp ni yangilaydi (ON CONFLICT UPDATE)
  // 5. checkAchievements() — yutuqlar tekshiriladi
  // 6. Qaytaradi: { xp, level, streak, newAchievements }
}
```

### Yutuqlar (Achievements)

```sql
-- achievements jadvalida:
{ type: 'first_solve', ... }        → correctAttempts >= 1
{ type: 'xp_threshold', xp_threshold: 500 } → total xp >= 500
{ type: 'streak_threshold', streak_threshold: 7 } → streak >= 7
```

---

## 3. ELO Reytingi (Shaxmat)

- Boshlang'ich ELO: **1200**
- Stockfish WASM brauzerda ishlaydi (offline, serverga yuborilmaydi)
- O'yin natijasi → POST /gamification/elo → ELO yangilanadi
- `/student/leaderboard` — guruh ichida ELO bo'yicha tartib

---

## 4. Video Darsliklar

### Admin/Teacher Tomonidan Yuklash

1. POST `/videos/upload` — MP4 fayl → `uploads/videos/{tenantId}/{uuid}.mp4`
2. POST `/upload/image` — Thumbnail → `uploads/images/{tenantId}/{uuid}.jpg`
3. POST `/videos` — Video yozuvini yaratish (url, thumbnail, kategoriya)

### O'quvchi Ko'rishi

1. GET `/videos?category=taktika` → `progressPct` bilan
2. Video player → ko'rish davom ettiriladi
3. 100% yetganda: POST `/videos/:id/progress { progressPct: 100 }`
4. Backend: `wasCompleted` tekshiradi → birinchi marta `awardXp(+20)`
5. Frontend XP toast ko'rsatadi

---

## 5. Uy Vazifalari

### Teacher Jarayoni

```
/teacher/materials → "Vazifa qo'shish"
→ { groupId, title, description, dueDate, xpReward: 30 }
→ POST /homework
→ homework jadvaliga yoziladi
```

### O'quvchi Jarayoni

```
/student/lessons → "Uy vazifalari" bo'limi
→ GET /homework → { done: false, title, dueDate, xpReward }
→ Checkbox bosish → POST /homework/:id/complete
→ homework_completions ga yoziladi
→ awardXp(xpReward) → XP toast
```

---

## 6. Boshqotirmalar (Puzzles)

### Teacher Yaratadi

```
/teacher/puzzles/new
→ FEN kiriting → real-time taxtada ko'rinadi
→ Yechim: "e2e4,d7d5,e4e5" (UCI format)
→ Qiyinlik (1-5), XP miqdori
→ POST /puzzles
```

### O'quvchi Yechadi

```
/student/puzzles
→ GET /puzzles → puzzle kartalar ro'yxati
→ Puzzle tanlanadi → taxtada harakat qilinadi
→ POST /puzzles/:id/attempt { move: "e2e4" }
→ To'g'ri? → awardXp() → XP toast
```

### Kunlik Masala

```
/student dashboard → "Bugungi masala" kartasi
→ GET /daily-puzzle → is_daily=true puzzle qaytaradi
→ Har kun yangi masala (admin/teacher belgilaydi)
```

---

## 7. CRM Arizalar

### Jarayon

```
Yangi klient → Admin /admin/applications → "Yangi ariza"
→ { fullName, phone, age, level, source }

Status o'zgartirish:
yangi → muloqot (qo'ng'iroq qilindi)
      → test (sinov darsi bo'ldi)
        → qabul (o'quvchiga aylantirish)
        → rad (qabul qilinmadi)

"O'quvchiga aylantirish" tugmasi:
→ POST /applications/:id/convert
→ users + students yaratiladi
→ Paket tayinlash kerak
→ Guruhga qo'shish kerak
```

---

## 8. Bildirishnomalar

### Avtomatik Bildirishnomalar

| Holat | Kimga | Xabar |
|-------|-------|-------|
| Paket tugadi | O'quvchi | "Paketingiz tugadi, yangi paket sotib oling" |
| Kam qoldi (≤3) | O'quvchi | "Siz uchun N ta dars qoldi" |
| Yangi vazifa | Guruh o'quvchilari | "Yangi uy vazifasi qo'shildi" |

### Ommaviy Xabar

```
Admin → /admin/broadcast
→ Auditoriya tanlash (barcha, guruh, rol)
→ Sarlavha + matn
→ POST /notifications/broadcast
→ Barcha tanlangan foydalanuvchilarga yoziladi
```

---

## 9. Maosh Hisoblash

### Turlar

1. **Foiz usuli:** Admin to'lov tayinlaganda — `amount × rate%` hisoblanadi
2. **Soatlik:** Davomat belgilanganida — `sessiyalar_soni × stavka`
3. **Oylik:** Belgilangan miqdor (har oy to'lanadi)

### Ko'rish

- Teacher: `/teacher/income` — oylar bo'yicha taqsimot
- Admin: `/admin/reports` — barcha o'qituvchilar maoshi

---

## 10. Sozlamalar

### Maktab Sozlamalari (`/admin/settings`)

- **Brend:** Maktab nomi, logo, rangi
- **Narxlar:** Paket turlari sozlamasi
- **Rollar:** Xodimlar va ruxsatlar
- **Umumiy:** Telefon, manzil
- **Ish haqi:** Maosh hisoblash usuli
- **Telegram:** Bot token (bildirishnomalar uchun — hozir integratsiya yo'q)
