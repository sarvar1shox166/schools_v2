# CLAUDE.md — Shaxmat Maktabi Tizimi

Bu fayl Claude uchun — loyihani tezda tushunib, ishlashni boshlash uchun.

## Loyiha nima?

Multi-tenant (ko'p maktab) online shaxmat maktab boshqaruv tizimi. Har bir maktab alohida `tenant_id` bilan ajratilgan. 4 rol: `super_admin`, `admin`, `teacher`, `student`.

## Papka tuzilishi

```
apps/api/src/
  app.ts              # Fastify ilova, plugin ro'yxati
  server.ts           # HTTP server, port 3001
  db/pool.ts          # PostgreSQL connection pool
  db/migrations/      # 0001..0025 SQL migratsiya fayllari
  modules/
    auth/             # login, refresh token
    students/         # CRUD, paketlar
    teachers/         # CRUD, rating
    groups/           # Guruhlar
    schedule/         # Haftalik jadval slotlari
    attendance/       # Davomat (consumeLesson/refundLesson)
    homework/         # Uy vazifalari
    videos/           # Video darsliklar, progress
    puzzles/          # Boshqotirmalar
    payments/         # Paketlar, tranzaksiyalar, lessons.ts
    gamification/     # xp.ts — awardXp(), achievement tekshiruvi
    applications/     # CRM — arizalar
    notifications/    # Bildirishnomalar + broadcast
    reports/          # Hisobotlar
    settings/         # Maktab sozlamalari
    staff/            # Xodimlar va rollar
    pvp/              # ELO hisoblash

apps/web/src/
  App.tsx             # Route guruhlari: /admin/*, /teacher/*, /student/*
  lib/
    auth-store.ts     # Zustand store (key: 'chess-school-auth')
    queries.ts        # Barcha useQuery/useMutation hooklari
  layouts/
    AppShell.tsx      # Umumiy shell: sidebar, topbar, mob hamburger
    Sidebar.tsx       # Nav sidebar komponenti
  pages/
    admin/            # ~17 sahifa
    teacher/          # ~10 sahifa
    student/          # ~8 sahifa
    auth/LoginPage.tsx

packages/ui/src/
  styles.css          # Global CSS (CSS custom properties, mobile media queries)
  index.ts            # Export: Icon, XpToastHost, Card, ...
```

## Muhim Konstantalar

```typescript
// JWT payload
{ sub: userId, role: 'admin'|'teacher'|'student'|'super_admin', tenantId: string }

// Zustand store
useAuthStore(s => s.user)         // { id, fullName, role, tenantId }
useAuthStore(s => s.accessToken)  // Bearer token

// XP daraja formulasi
level = Math.floor(xp / 200) + 1

// Davomat statuslari
'p'  = present (keldi) — dars krediti sarflanadi
'a'  = absent (kelmadi) — dars krediti sarflanadi
'l'  = late (kechikdi) — dars krediti sarflanadi
'ae' = absent excused (sababli) — kredit SARFLANMAYDI

// Vite proxy
/api → http://localhost:3001/api
/uploads → http://localhost:3001/uploads
```

## Asosiy Fayl Ishlash Mantiqasi

### Backend autentifikatsiya
```typescript
// Har route da:
app.addHook("onRequest", app.authenticate);       // JWT tekshirish
app.requireRole("admin", "teacher")               // Rol tekshirish

// SQL da har doim:
WHERE tenant_id = $N  // Multi-tenant izolatsiya
```

### Dars krediti jarayoni (`apps/api/src/modules/payments/lessons.ts`)
```typescript
consumeLesson(client, studentId)  // p/a/l → used_lessons++
refundLesson(client, studentId)   // ae ga o'zgarsa → used_lessons--
// Tugaganda: status='finished', bildirishnoma yuboriladi
```

### XP berish (`apps/api/src/modules/gamification/xp.ts`)
```typescript
await awardXp(client, studentId, amount)
// → XP qo'shadi, daraja hisoblaydi, streak yangilaydi, yutuqlar tekshiradi
// → { xp, level, streak, newAchievements } qaytaradi
```

### Frontend ma'lumot olish (`apps/web/src/lib/queries.ts`)
```typescript
useMyPackages()         // GET /me/packages → [{totalLessons, usedLessons, status}]
useMyXp()              // GET /me/xp → {xp, level, streak, achievements}
useUnreadNotifications() // GET /notifications/unread-count
```

## Mobil Ko'rinish (`packages/ui/src/styles.css`)

```css
/* <768px: sidebar yashiriladi, hamburger ko'rinadi */
/* .app:not(.collapsed) .sidebar = overlay ochiq (admin/teacher) */
/* .app.kid-theme.mob-open .sidebar = overlay ochiq (student) */
```

`AppShell.tsx` da:
- Admin/teacher: `collapsed` state → `toggleCollapse()`
- Student: `mobOpen` state → `setMobOpen(true/false)`
- Backdrop bosish → sidebar yopiladi
- Route o'zgarsa → `useEffect(() => setMobOpen(false), [location.pathname])`

## DB Jadvallar (asosiylar)

| Jadval | Maqsad |
|--------|--------|
| `users` | Barcha foydalanuvchilar (role, phone, tenant_id) |
| `students` | O'quvchi profili (user_id, group_id, elo_rating) |
| `teachers` | O'qituvchi (user_id, spec, salary_type) |
| `groups` | Guruhlar (teacher_id) |
| `schedule_slots` | Haftalik jadval (group_id, day_of_week, start_time) |
| `attendance` | Davomat (student_id, slot_id, date, status) |
| `packages` | Paket turlari (lessons_count, price) |
| `student_packages` | O'quvchiga tayinlangan paket (total/used_lessons, status) |
| `transactions` | To'lovlar |
| `student_xp` | XP, daraja, streak, last_xp_date |
| `video_lessons` | Videolar (category enum, video_url) |
| `video_progress` | O'quvchi video ko'rish % |
| `homework` | Uy vazifalari (group_id, xp_reward) |
| `homework_completions` | Kim bajardi |
| `puzzles` | Boshqotirmalar (fen, solution, teacher_id) |
| `puzzle_attempts` | Urinishlar (student_id, correct) |
| `notifications` | Bildirishnomalar (user_id, read_at) |
| `applications` | CRM arizalar (status: yangi/muloqot/test/qabul/rad) |
| `tenant_settings` | Maktab sozlamalari |

## Migratsiyalar

```bash
cd apps/api
npm run migrate   # Barcha yangi SQL fayllarni ishga tushiradi
npm run seed      # Test ma'lumotlari (3 foydalanuvchi, 1 guruh, 1 jadval)
```

Migratsiya fayllari: `apps/api/src/db/migrations/0001_*.sql` → `0025_*.sql`

## Keng Tarqalgan Xatolar va Yechimlari

### Vite HMR kesh muammosi
```bash
# Agar "module does not provide export" xatoligi bo'lsa:
Remove-Item -Recurse -Force "apps/web/node_modules/.vite"
# Keyin dev server qayta ishga tushiriladi
```

### TypeScript tekshirish
```bash
npx tsc -p apps/web/tsconfig.json --noEmit   # Frontend
npx tsc -p apps/api/tsconfig.json --noEmit   # Backend
```

### Dev serverlar
```bash
# Backend (auto-reload tsx watch bilan)
cd apps/api && npm run dev

# Frontend
cd apps/web && npm run dev
```

## Qo'shilishi Mumkin Bo'lgan Funksiyalar (TODO)

- [ ] Telegram bot integratsiya (token allaqachon settings da bor)
- [ ] S3 fayl saqlash (hozir local `uploads/` papkasi)
- [ ] Online to'lov (Click/Payme webhook)
- [ ] Real-time bildirishnomalar (WebSocket yoki SSE)
- [ ] Parent portal (ota-ona o'quvchi progressini ko'radi)
- [ ] Mobile app (React Native yoki PWA)

## Hujjatlar

- [`docs/architecture.md`](docs/architecture.md) — Arxitektura batafsil
- [`docs/api.md`](docs/api.md) — API endpointlar
- [`docs/database.md`](docs/database.md) — DB sxema
- [`docs/features.md`](docs/features.md) — Funksionallar
- [`docs.html`](docs.html) — Interaktiv hujjat (brauzerda ochish)
