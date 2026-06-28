# Arxitektura — Shaxmat Maktabi

## Umumiy Ko'rinish

```
Browser (React SPA)
       │
       │ HTTP (Vite dev proxy: /api → :3001)
       ▼
Fastify API (port 3001)
       │
       │ pool.query (pg)
       ▼
PostgreSQL Database
```

Ishlab chiqarish (production) muhitida Vite proxy o'rniga Nginx yoki CDN ishlatiladi.

## Frontend Arxitekturasi

### Texnologiyalar
| Kutubxona | Versiya | Maqsad |
|-----------|---------|--------|
| React | 18 | UI |
| TypeScript | 5 | Tip xavfsizligi |
| Vite | 5 | Build tool, HMR |
| React Router | v6 | Client-side routing |
| TanStack Query | v5 | Server state boshqaruvi |
| Zustand | 4 | Auth store (persist) |
| chess.js | — | Shaxmat mantiqı |
| Stockfish WASM | — | Kompyuter shaxmat motori |

### Papka tuzilishi (`apps/web/src/`)

```
App.tsx                    # Root routing — 4 rol uchun route guruhlari
lib/
  auth-store.ts            # Zustand persist store (key: chess-school-auth)
  queries.ts               # Barcha API hooklar (useQuery, useMutation)
layouts/
  AppShell.tsx             # Umumiy layout: sidebar + topbar + Outlet
  Sidebar.tsx              # Nav sidebar (admin/teacher/student variant)
pages/
  auth/LoginPage.tsx
  admin/                   # 17 sahifa
  teacher/                 # 10 sahifa
  student/                 # 8 sahifa
components/
  ChessBoard.tsx           # Interaktiv shaxmat taxtasi komponenti
```

### State Boshqaruvi

```typescript
// 1. Auth state — Zustand persist (localStorage)
// chess-school-auth kaliti bilan saqlanadi
const { user, accessToken, refreshToken, setTokens, logout } = useAuthStore()

// 2. Server state — TanStack Query
// Avtomatik cache, refetch, loading/error holatlari
const { data, isLoading, error } = useStudents()
const mutation = useCreateStudent()

// 3. Local state — useState
// Form ma'lumotlari, modal holatlari
```

### Routing Tuzilishi

```typescript
// App.tsx
/login                    → LoginPage
/admin/*                  → RequireAuth(admin) → AdminLayout → ...sahifalar
/teacher/*                → RequireAuth(teacher) → TeacherLayout → ...sahifalar
/student/*                → RequireAuth(student) → StudentLayout → ...sahifalar
```

`RequireAuth` komponenti: token yo'q bo'lsa `/login` ga redirect qiladi.

## Backend Arxitekturasi

### Texnologiyalar
| Kutubxona | Maqsad |
|-----------|--------|
| Fastify v4 | HTTP framework |
| @fastify/jwt | JWT autentifikatsiya |
| @fastify/multipart | Fayl yuklash |
| @fastify/cors | CORS |
| pg (node-postgres) | PostgreSQL |
| zod | Request validatsiya |
| bcrypt | Parol hash |
| tsx watch | TypeScript auto-reload |

### Request Hayoti Tsikli

```
1. Mijoz so'rov yuboradi (Bearer token bilan)
2. app.authenticate hook → JWT tekshiradi → request.user to'ldiriladi
3. requireRole() (ixtiyoriy) → rol tekshiradi
4. Route handler → Zod bilan body/query validate qiladi
5. pool.query() bilan SQL → tenant_id WHERE sharti har doim
6. JSON javob qaytariladi
```

### Plugin Ro'yxati (`apps/api/src/app.ts`)

```typescript
fastify.register(cors)
fastify.register(jwt, { secret: JWT_SECRET })
fastify.register(multipart)
fastify.decorate('authenticate', verifyJwt)
fastify.decorate('requireRole', (...roles) => hook)

// Route plugin-lar:
fastify.register(authRoutes)
fastify.register(studentsRoutes)
fastify.register(teachersRoutes)
// ... va boshqalar
```

## Multi-Tenant Arxitekturasi

Har bir maktab — bitta tenant. Barcha jadvallar `tenant_id` ustuniga ega.

```sql
-- Har SQL so'rovda:
WHERE tenant_id = $1  -- foydalanuvchi token dan olingan tenantId

-- Hech qachon boshqa tenant ma'lumotini ko'rmaydi
-- JWT → { tenantId } → request.user.tenantId → SQL WHERE
```

### Tenant Yaratish Jarayoni
1. Super admin yangi maktab yaratadi
2. `tenants` jadvaliga qo'shiladi
3. Birinchi admin foydalanuvchi yaratiladi
4. Admin login qilib o'z portalida ishlaydi

## Autentifikatsiya

### JWT Oqimi

```
Login → POST /api/v1/auth/login
      → { accessToken (15 min), refreshToken (7 kun) }

Har so'rovda → Authorization: Bearer <accessToken>
             → app.authenticate → request.user = { sub, role, tenantId }

Token tugasa → POST /api/v1/auth/refresh
             → yangi accessToken
```

### Token Payload

```json
{
  "sub": "uuid-foydalanuvchi-id",
  "role": "admin",
  "tenantId": "uuid-maktab-id",
  "iat": 1234567890,
  "exp": 1234568790
}
```

## Fayl Yuklash

```
POST /api/v1/videos/upload   → uploads/videos/{tenantId}/{uuid}.mp4
POST /api/v1/upload/image    → uploads/images/{tenantId}/{uuid}.jpg

GET /uploads/...             → Fastify static fayl servis qiladi
```

Ishlab chiqarishda ushbu papkalar S3 ga ko'chirilishi kerak.

## Mobil Ko'rinish

`packages/ui/src/styles.css` da `@media (max-width: 768px)`:

- `.app` → `grid-template-columns: 1fr` (sidebar ko'rinmaydi)
- `.sidebar` → `position: fixed; transform: translateX(-100%)` (yashirilgan)
- `.mob-hamburger` → ko'rinadi (admin/teacher/student topbarda)

### Sidebar Ochish Mexanizmi

**Admin/Teacher** (`collapsed` state):
```
collapsed=true → .app.collapsed (sidebar yashirilgan)
collapsed=false → overlay ko'rinadi
Backdrop click → setCollapsed(true)
```

**Student** (`mobOpen` state + `kid-theme`):
```
mobOpen=true → .app.kid-theme.mob-open (sidebar overlay)
mobOpen=false → yashirilgan
Backdrop click → setMobOpen(false)
Route o'zgarsa → useEffect → setMobOpen(false)
```
