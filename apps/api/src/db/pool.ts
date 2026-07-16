import { Pool, types } from "pg";
import { env } from "../env.js";

// Postgres DATE (OID 1082) ustunlarini pg drayveri sukut bo'yicha mahalliy vaqt zonasidagi
// yarim tunga mos JS Date obyektiga aylantiradi. Bu obyekt keyinchalik JSON'ga
// serialize qilinganda (yoki .toISOString() chaqirilganda) UTC'ga o'tkaziladi — musbat
// UTC-ofset zonalarida (masalan Toshkent, UTC+5) bu sanani bir kun orqaga surib qo'yadi.
// Xom "YYYY-MM-DD" satr qaytarish bu muammoni butunlay bartaraf etadi.
types.setTypeParser(1082, (val) => val);

// Postgres NUMERIC/DECIMAL (OID 1700) ustunlarini pg drayveri sukut bo'yicha JS string
// sifatida qaytaradi (aniqlikni yo'qotmaslik uchun) — lekin bu loyihada barcha NUMERIC
// ustunlar pul/stavka miqdorlari bo'lib, JS number (float64) ularni xavfsiz ifodalaydi.
// Xom string qaytarilishi frontendda "10000.00" kabi qiymatlarni raqam o'rniga satr
// sifatida yuborib, backend validatsiyasini (zod z.number()) buzib qo'yardi.
types.setTypeParser(1700, (val) => parseFloat(val));

export const pool = new Pool({
  connectionString: env.DATABASE_URL,
});
