# Ma'lumotlar Bazasi — Sxema

**DBMS:** PostgreSQL  
**ORM:** Yo'q — to'g'ridan-to'g'ri `pool.query()` (node-postgres)  
**Multi-tenant:** Har bir jadvaldagi `tenant_id` ustuni

## Migratsiyalar

```bash
cd apps/api
npm run migrate   # apps/api/src/db/migrations/ papkasidan tartib bilan bajaradi
npm run seed      # Test ma'lumotlari
```

| Fayl | Tavsif |
|------|--------|
| 0001 | tenants, users, students, teachers, groups |
| 0002 | schedule_slots |
| 0003 | attendance |
| 0004 | student_xp, puzzles, puzzle_attempts |
| 0005 | video_lessons, video_progress |
| 0006 | homework, homework_completions |
| 0007 | notifications |
| 0008 | packages, student_packages, transactions |
| 0009-0016 | Indekslar, statistika, fayl path-lari |
| 0017 | users.login ustuni qo'shildi |
| 0018 | applications (CRM) |
| 0019 | tenant_settings, pricing_tiers |
| 0020 | teacher_reviews |
| 0021 | salary_type enum, teacher_rates |
| 0022 | staff_roles |
| 0023 | packages v2 (yangi ustunlar) |
| 0024 | lessons (student_packages, consumeLesson mantiq) |
| 0025 | video_lessons thumbnail ustunlari |

---

## Jadvallar

### tenants
```sql
id           UUID PRIMARY KEY
name         TEXT NOT NULL
slug         TEXT UNIQUE  -- maktab kodi
created_at   TIMESTAMPTZ
```

### users
```sql
id           UUID PRIMARY KEY
tenant_id    UUID REFERENCES tenants
full_name    TEXT NOT NULL
phone        TEXT NOT NULL
login        TEXT           -- ixtiyoriy login nomi
password_hash TEXT NOT NULL
role         TEXT NOT NULL  -- super_admin | admin | teacher | student
created_at   TIMESTAMPTZ
UNIQUE(tenant_id, phone)
```

### students
```sql
id           UUID PRIMARY KEY
tenant_id    UUID REFERENCES tenants
user_id      UUID REFERENCES users
group_id     UUID REFERENCES groups (NULL bo'lishi mumkin)
elo_rating   INTEGER DEFAULT 1200
date_of_birth DATE
gender       TEXT  -- male | female
created_at   TIMESTAMPTZ
```

### teachers
```sql
id           UUID PRIMARY KEY
tenant_id    UUID REFERENCES tenants
user_id      UUID REFERENCES users
spec         TEXT    -- mutaxassislik
experience_years INTEGER
salary_type  TEXT    -- percent | hourly | monthly
created_at   TIMESTAMPTZ
```

### groups
```sql
id           UUID PRIMARY KEY
tenant_id    UUID REFERENCES tenants
name         TEXT NOT NULL
teacher_id   UUID REFERENCES teachers
level        TEXT  -- beginner | intermediate | advanced
max_students INTEGER DEFAULT 8
active       BOOLEAN DEFAULT true
created_at   TIMESTAMPTZ
```

### schedule_slots
```sql
id             UUID PRIMARY KEY
tenant_id      UUID REFERENCES tenants
group_id       UUID REFERENCES groups
day_of_week    INTEGER  -- 1=Dushanba, 7=Yakshanba
start_time     TIME NOT NULL
end_time       TIME
room_or_link   TEXT
created_at     TIMESTAMPTZ
```

### attendance
```sql
id               UUID PRIMARY KEY
tenant_id        UUID REFERENCES tenants
student_id       UUID REFERENCES students
schedule_slot_id UUID REFERENCES schedule_slots
date             DATE NOT NULL
status           TEXT NOT NULL  -- p | a | l | ae
marked_by        UUID REFERENCES users  -- teacher yoki admin
created_at       TIMESTAMPTZ
UNIQUE(student_id, schedule_slot_id, date)
```

**Muhim:** `status = 'ae'` (sababli) bo'lsa `consumeLesson()` chaqirilmaydi.

### packages
```sql
id             UUID PRIMARY KEY
tenant_id      UUID REFERENCES tenants
name           TEXT NOT NULL
price          INTEGER NOT NULL  -- so'm
lessons_count  INTEGER NOT NULL
type           TEXT  -- group | individual
tier           TEXT  -- standard | pro
delivery       TEXT  -- online | offline | hybrid
active         BOOLEAN DEFAULT true
created_at     TIMESTAMPTZ
```

### student_packages
```sql
id             UUID PRIMARY KEY
tenant_id      UUID REFERENCES tenants
student_id     UUID REFERENCES students
package_id     UUID REFERENCES packages
total_lessons  INTEGER NOT NULL
used_lessons   INTEGER DEFAULT 0
status         TEXT DEFAULT 'active'  -- active | finished | expired
purchased_at   TIMESTAMPTZ
expires_at     DATE
```

### transactions
```sql
id              UUID PRIMARY KEY
tenant_id       UUID REFERENCES tenants
student_id      UUID REFERENCES students
package_id      UUID REFERENCES packages (NULL bo'lishi mumkin)
amount          INTEGER NOT NULL  -- so'm
payment_method  TEXT  -- cash | uzcard | click | payme
paid_at         TIMESTAMPTZ
note            TEXT
created_at      TIMESTAMPTZ
```

### student_xp
```sql
id            UUID PRIMARY KEY
tenant_id     UUID REFERENCES tenants
student_id    UUID REFERENCES students UNIQUE
xp            INTEGER DEFAULT 0
level         INTEGER DEFAULT 1
streak        INTEGER DEFAULT 0
last_xp_date  DATE
created_at    TIMESTAMPTZ
```

### video_lessons
```sql
id                UUID PRIMARY KEY
tenant_id         UUID REFERENCES tenants
teacher_id        UUID REFERENCES teachers (NULL bo'lishi mumkin)
title             TEXT NOT NULL
category          TEXT  -- zoom | debyut | taktika | endshpil | strategiya
video_url         TEXT NOT NULL  -- /uploads/videos/{tenantId}/{uuid}.mp4
duration_seconds  INTEGER
thumbnail_url     TEXT
thumbnail_color   TEXT  -- #hex rang (thumbnail_url yo'q bo'lsa)
thumbnail_icon    TEXT  -- emoji yoki matn
created_at        TIMESTAMPTZ
```

### video_progress
```sql
id            UUID PRIMARY KEY
student_id    UUID REFERENCES students
video_id      UUID REFERENCES video_lessons
progress_pct  INTEGER DEFAULT 0  -- 0..100
watched_at    TIMESTAMPTZ
UNIQUE(student_id, video_id)
```

### homework
```sql
id          UUID PRIMARY KEY
tenant_id   UUID REFERENCES tenants
teacher_id  UUID REFERENCES teachers
group_id    UUID REFERENCES groups
title       TEXT NOT NULL
description TEXT
due_date    DATE
xp_reward   INTEGER DEFAULT 30
created_at  TIMESTAMPTZ
```

### homework_completions
```sql
id          UUID PRIMARY KEY
homework_id UUID REFERENCES homework
student_id  UUID REFERENCES students
completed_at TIMESTAMPTZ
UNIQUE(homework_id, student_id)
```

### puzzles
```sql
id           UUID PRIMARY KEY
tenant_id    UUID REFERENCES tenants
teacher_id   UUID REFERENCES teachers
fen          TEXT NOT NULL  -- Shaxmat pozitsiyasi
solution     TEXT NOT NULL  -- "e2e4,d7d5" (vergul bilan ajratilgan harakatlar)
difficulty   INTEGER  -- 1..5
xp_reward    INTEGER DEFAULT 20
is_daily     BOOLEAN DEFAULT false
created_at   TIMESTAMPTZ
```

### puzzle_attempts
```sql
id          UUID PRIMARY KEY
puzzle_id   UUID REFERENCES puzzles
student_id  UUID REFERENCES students
correct     BOOLEAN NOT NULL
attempted_at TIMESTAMPTZ
```

### notifications
```sql
id          UUID PRIMARY KEY
tenant_id   UUID REFERENCES tenants
user_id     UUID REFERENCES users
title       TEXT NOT NULL
body        TEXT
type        TEXT  -- info | warning | success | package_expired
read_at     TIMESTAMPTZ  -- NULL = o'qilmagan
created_at  TIMESTAMPTZ
```

### applications (CRM)
```sql
id           UUID PRIMARY KEY
tenant_id    UUID REFERENCES tenants
full_name    TEXT NOT NULL
phone        TEXT NOT NULL
age          INTEGER
level        TEXT  -- beginner | intermediate | advanced
source       TEXT  -- instagram | telegram | referral | boshqa
status       TEXT DEFAULT 'yangi'  -- yangi | muloqot | test | qabul | rad
note         TEXT
created_at   TIMESTAMPTZ
updated_at   TIMESTAMPTZ
```

### tenant_settings
```sql
id               UUID PRIMARY KEY
tenant_id        UUID REFERENCES tenants UNIQUE
school_name      TEXT
phone            TEXT
telegram_bot_token TEXT
logo_url         TEXT
updated_at       TIMESTAMPTZ
```

### teacher_rates
```sql
id           UUID PRIMARY KEY
teacher_id   UUID REFERENCES teachers UNIQUE
salary_type  TEXT  -- percent | hourly | monthly
rate_value   NUMERIC  -- foiz yoki summa
effective_from DATE
```

---

## Ko'p Ishlatiladigan SQL Namunalari

```sql
-- O'quvchi aktiv paketini olish
SELECT sp.*, p.name AS package_name
FROM student_packages sp
JOIN packages p ON p.id = sp.package_id
WHERE sp.student_id = $1
  AND sp.status = 'active'
ORDER BY sp.purchased_at ASC
LIMIT 1;

-- Guruh davomatini olish
SELECT s.id, u.full_name,
       COALESCE(a.status, 'p') AS status
FROM students s
JOIN users u ON u.id = s.user_id
LEFT JOIN attendance a ON a.student_id = s.id
  AND a.schedule_slot_id = $1
  AND a.date = $2
WHERE s.group_id = $3
  AND s.tenant_id = $4;

-- O'quvchi XP ni yangilash
INSERT INTO student_xp (tenant_id, student_id, xp, level, streak, last_xp_date)
VALUES ($1, $2, $3, $4, $5, CURRENT_DATE)
ON CONFLICT (student_id)
DO UPDATE SET xp = $3, level = $4, streak = $5, last_xp_date = CURRENT_DATE;
```
