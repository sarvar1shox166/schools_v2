#!/bin/sh
set -e

OUT=".env.prod"

if [ -f "$OUT" ]; then
  printf "%s allaqachon mavjud. Ustiga yozilsinmi? [y/N] " "$OUT"
  read -r ans
  case "$ans" in [yY]) ;; *) echo "Bekor qilindi."; exit 0 ;; esac
fi

echo "==> Secretlar generatsiya qilinmoqda..."

JWT_SECRET=$(openssl rand -hex 32)
JWT_REFRESH_SECRET=$(openssl rand -hex 32)

printf "DB paroli kiriting (bo'sh qoldirmang): "
read -r DB_PASS
if [ -z "$DB_PASS" ]; then
  echo "Xato: DB paroli bo'sh bo'lishi mumkin emas."
  exit 1
fi

cat > "$OUT" <<EOF
# Avtomatik yaratilgan — $(date -u +"%Y-%m-%d %H:%M UTC")
# Ishlatish: docker compose --env-file .env.prod up -d --build

POSTGRES_DB=chess_school
POSTGRES_USER=chess
POSTGRES_PASSWORD=${DB_PASS}

JWT_SECRET=${JWT_SECRET}
JWT_REFRESH_SECRET=${JWT_REFRESH_SECRET}

TELEGRAM_BOT_TOKEN=
EOF

echo "==> $OUT yaratildi."
echo "    JWT_SECRET va JWT_REFRESH_SECRET avtomatik generatsiya qilindi."
echo "    TELEGRAM_BOT_TOKEN ni kerak bo'lsa qo'shing."
