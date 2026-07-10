import { Pool, types } from "pg";
import { env } from "../env.js";

// Postgres DATE (OID 1082) ustunlarini pg drayveri sukut bo'yicha mahalliy vaqt zonasidagi
// yarim tunga mos JS Date obyektiga aylantiradi. Bu obyekt keyinchalik JSON'ga
// serialize qilinganda (yoki .toISOString() chaqirilganda) UTC'ga o'tkaziladi — musbat
// UTC-ofset zonalarida (masalan Toshkent, UTC+5) bu sanani bir kun orqaga surib qo'yadi.
// Xom "YYYY-MM-DD" satr qaytarish bu muammoni butunlay bartaraf etadi.
types.setTypeParser(1082, (val) => val);

export const pool = new Pool({
  connectionString: env.DATABASE_URL,
});
