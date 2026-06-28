# API Hujjati

**Bazaviy URL:** `http://localhost:3001/api/v1`

**Autentifikatsiya:** Barcha endpointlar (login bundan mustasno) `Authorization: Bearer <accessToken>` talab qiladi.

**Rol belgilari:** 🟣 super_admin · 🔵 admin · 🟢 teacher · 🟡 student

---

## Auth

| Method | URL | Rol | Tavsif |
|--------|-----|-----|--------|
| POST | `/auth/login` | Hamma | `{ phone, password }` → `{ accessToken, refreshToken, user }` |
| POST | `/auth/refresh` | Hamma | `{ refreshToken }` → `{ accessToken }` |

---

## O'quvchilar

| Method | URL | Rol | Tavsif |
|--------|-----|-----|--------|
| GET | `/students` | 🔵🟢 | Ro'yxat (`?page&pageSize&groupId&search`) |
| POST | `/students` | 🔵 | Yangi o'quvchi yaratish |
| GET | `/students/:id` | 🔵🟢 | Bitta o'quvchi |
| PATCH | `/students/:id` | 🔵 | Tahrirlash |
| DELETE | `/students/:id` | 🔵 | O'chirish |
| GET | `/students/:id/packages` | 🔵 | O'quvchi paketlari |
| GET | `/me/packages` | 🟡 | O'z paketlari → `[{ id, totalLessons, usedLessons, status, purchasedAt, expiresAt }]` |
| GET | `/me/attendance-history` | 🟡 | O'z davomati tarixi (so'ngi 30 ta) |

### POST /students request body
```json
{
  "fullName": "Ism Familiya",
  "phone": "+998901234567",
  "password": "password123",
  "groupId": "uuid",
  "dateOfBirth": "2010-01-15",
  "gender": "male"
}
```

---

## O'qituvchilar

| Method | URL | Rol | Tavsif |
|--------|-----|-----|--------|
| GET | `/teachers` | 🔵 | Ro'yxat |
| POST | `/teachers` | 🔵 | Yangi o'qituvchi |
| GET | `/teachers/:id` | 🔵🟢 | Bitta o'qituvchi |
| PATCH | `/teachers/:id` | 🔵 | Tahrirlash |
| DELETE | `/teachers/:id` | 🔵 | O'chirish |
| GET | `/teachers/rankings` | 🔵 | Reyting ro'yxati |
| POST | `/teachers/:id/reviews` | 🔵 | Sharh qo'shish |

---

## Guruhlar

| Method | URL | Rol | Tavsif |
|--------|-----|-----|--------|
| GET | `/groups` | 🔵🟢 | Ro'yxat (teacher: faqat o'z guruhlari) |
| POST | `/groups` | 🔵 | Yangi guruh |
| PATCH | `/groups/:id` | 🔵 | Tahrirlash |
| DELETE | `/groups/:id` | 🔵 | O'chirish |

---

## Jadval

| Method | URL | Rol | Tavsif |
|--------|-----|-----|--------|
| GET | `/schedule` | 🔵🟢🟡 | Haftalik jadval (rol asosida filtrlangan) |
| POST | `/schedule` | 🔵 | Yangi slot |
| PATCH | `/schedule/:id` | 🔵 | Tahrirlash |
| DELETE | `/schedule/:id` | 🔵 | O'chirish |

### GET /schedule javob
```json
[
  {
    "id": "uuid",
    "groupId": "uuid",
    "groupName": "Boshlang'ichlar A",
    "teacherName": "Alisher Karimov",
    "dayOfWeek": 1,
    "startTime": "14:00",
    "endTime": "15:30",
    "roomOrLink": "Xona 1"
  }
]
```

---

## Davomat

| Method | URL | Rol | Tavsif |
|--------|-----|-----|--------|
| GET | `/attendance` | 🔵🟢 | `?scheduleSlotId&date` → guruh davomati |
| POST | `/attendance` | 🔵🟢 | Belgilash → consumeLesson() / refundLesson() |
| GET | `/attendance/stats` | 🔵 | Bugungi statistika (admin dashboard) |
| GET | `/attendance/history` | 🔵🟢 | Matrits ko'rinishi |

### POST /attendance request body
```json
{
  "scheduleSlotId": "uuid",
  "date": "2026-06-28",
  "records": [
    { "studentId": "uuid", "status": "p" },
    { "studentId": "uuid", "status": "ae" }
  ]
}
```

**Status qiymatlari:**
- `p` — present (keldi) → dars kredit sarflanadi
- `a` — absent (kelmadi) → dars kredit sarflanadi
- `l` — late (kechikdi) → dars kredit sarflanadi
- `ae` — absent excused (sababli) → **kredit sarflanmaydi**

---

## Uy Vazifalari

| Method | URL | Rol | Tavsif |
|--------|-----|-----|--------|
| GET | `/homework` | 🟢🟡 | Teacher: o'z guruhlari; Student: o'ziniki (`done: bool`) |
| POST | `/homework` | 🟢 | Yangi vazifa |
| PATCH | `/homework/:id` | 🟢 | Tahrirlash |
| DELETE | `/homework/:id` | 🟢 | O'chirish |
| POST | `/homework/:id/complete` | 🟡 | Bajarish → `awardXp(+30)` → `{ xp, level, streak }` |

### POST /homework request body
```json
{
  "groupId": "uuid",
  "title": "Ruy Lopez o'rganish",
  "description": "1-10 darslarni ko'rib chiqing",
  "dueDate": "2026-07-05",
  "xpReward": 30
}
```

---

## Video Darsliklar

| Method | URL | Rol | Tavsif |
|--------|-----|-----|--------|
| GET | `/videos` | Hamma | `?category=taktika` → ro'yxat (student: `progressPct` ham) |
| POST | `/videos` | 🔵🟢 | Yozuv yaratish |
| POST | `/videos/upload` | 🔵🟢 | MP4 yuklash → `{ url }` |
| POST | `/upload/image` | 🔵🟢 | Rasm yuklash → `{ url }` |
| POST | `/videos/:id/progress` | 🟡 | `{ progressPct: 100 }` → +20 XP (birinchi marta) |
| DELETE | `/videos/:id` | 🔵🟢 | O'chirish |

**Kategoriyalar:** `zoom`, `debyut`, `taktika`, `endshpil`, `strategiya`

---

## To'lovlar va Paketlar

| Method | URL | Rol | Tavsif |
|--------|-----|-----|--------|
| GET | `/packages` | 🔵 | Aktiv paketlar ro'yxati |
| POST | `/packages` | 🔵 | Yangi paket |
| PATCH | `/packages/:id` | 🔵 | Tahrirlash (`active: false` = arxivlash) |
| DELETE | `/packages/:id` | 🔵 | O'chirish |
| POST | `/student-packages` | 🔵 | O'quvchiga paket tayinlash + tranzaksiya |
| GET | `/transactions` | 🔵 | To'lovlar tarixi |
| GET | `/payments/stats` | 🔵 | Moliya statistikasi |

### POST /student-packages request body
```json
{
  "studentId": "uuid",
  "packageId": "uuid",
  "paymentMethod": "cash",
  "amount": 500000,
  "paidAt": "2026-06-28"
}
```

**To'lov usullari:** `cash`, `uzcard`, `click`, `payme`

---

## Puzzle va Gamifikatsiya

| Method | URL | Rol | Tavsif |
|--------|-----|-----|--------|
| GET | `/puzzles` | 🟢🟡 | Ro'yxat |
| POST | `/puzzles` | 🟢 | Yangi puzzle |
| PATCH | `/puzzles/:id` | 🟢 | Tahrirlash |
| DELETE | `/puzzles/:id` | 🟢 | O'chirish |
| POST | `/puzzles/:id/attempt` | 🟡 | Urinish → to'g'ri bo'lsa `awardXp()` |
| GET | `/daily-puzzle` | 🟡 | Bugungi kunlik masala |
| GET | `/me/xp` | 🟡 | `{ xp, level, streak, achievements }` |
| GET | `/leaderboard` | 🟡 | Guruh ichida ELO reytingi |

---

## Bildirishnomalar

| Method | URL | Rol | Tavsif |
|--------|-----|-----|--------|
| GET | `/notifications` | Hamma | Kiruvchi bildirishnomalar |
| GET | `/notifications/unread-count` | Hamma | `{ count: N }` |
| PATCH | `/notifications/:id/read` | Hamma | O'qildi belgisi |
| POST | `/notifications/broadcast` | 🔵 | Ommaviy xabar |

---

## CRM Arizalar

| Method | URL | Rol | Tavsif |
|--------|-----|-----|--------|
| GET | `/applications` | 🔵 | Ro'yxat (`?status=yangi`) |
| POST | `/applications` | 🔵 | Yangi ariza |
| PATCH | `/applications/:id` | 🔵 | Status o'zgartirish |
| POST | `/applications/:id/convert` | 🔵 | O'quvchiga aylantirish |
| DELETE | `/applications/:id` | 🔵 | O'chirish |

**Ariza statuslari:** `yangi` → `muloqot` → `test` → `qabul` / `rad`

---

## Hisobotlar va Boshqalar

| Method | URL | Rol | Tavsif |
|--------|-----|-----|--------|
| GET | `/reports/overview` | 🔵 | Dashboard statistika |
| GET | `/reports/attendance` | 🔵 | Davomat hisoboti |
| GET | `/reports/payments` | 🔵 | To'lov hisoboti |
| GET | `/settings` | 🔵 | Maktab sozlamalari |
| PATCH | `/settings` | 🔵 | Sozlamalarni yangilash |
| GET | `/staff` | 🔵 | Xodimlar ro'yxati |
| POST | `/staff` | 🔵🟣 | Yangi xodim |
| GET | `/health` | Hamma | Server holati |

---

## Xato Kodlari

| Kod | Ma'no |
|-----|-------|
| 400 | Noto'g'ri so'rov (validatsiya xatosi) |
| 401 | Token yo'q yoki yaroqsiz |
| 403 | Rol ruxsati yo'q |
| 404 | Ma'lumot topilmadi |
| 409 | Konflikt (telefon/login allaqachon bor) |
| 500 | Server xatosi |

```json
// Xato javob formati
{ "error": "Xato tavsifi" }

// Zod validatsiya xatosi
{ "error": "Validation error", "issues": [...] }
```
