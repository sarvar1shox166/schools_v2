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

printf "DB paroli kiriting (@ # : / ? & belgilarsiz): "
read -r DB_PASS
if [ -z "$DB_PASS" ]; then
  echo "Xato: DB paroli bo'sh bo'lishi mumkin emas."
  exit 1
fi

# URL uchun maxsus belgilarni encode qilish
url_encode() {
  echo "$1" | sed 's/#/%23/g; s/@/%40/g; s/:/%3A/g; s|/|%2F|g; s/?/%3F/g; s/&/%26/g'
}
DB_PASS_ENCODED=$(url_encode "$DB_PASS")

printf "AWS S3 ishlatilsinmi? [y/N] "
read -r USE_AWS
AWS_KEY="" AWS_SECRET="" AWS_BUCKET="" AWS_REGION="eu-central-1" AWS_CDN=""
case "$USE_AWS" in
  [yY])
    printf "AWS_ACCESS_KEY_ID: "; read -r AWS_KEY
    printf "AWS_SECRET_ACCESS_KEY: "; read -r AWS_SECRET
    printf "S3 bucket nomi [chess-school-uploads]: "; read -r AWS_BUCKET
    AWS_BUCKET="${AWS_BUCKET:-chess-school-uploads}"
    printf "AWS region [eu-central-1]: "; read -r AWS_REGION
    AWS_REGION="${AWS_REGION:-eu-central-1}"
    printf "CDN URL (bo'sh qoldirsa S3 to'g'ridan ishlatiladi): "; read -r AWS_CDN
    ;;
esac

cat > "$OUT" <<EOF
# Avtomatik yaratilgan — $(date -u +"%Y-%m-%d %H:%M UTC")
# Ishlatish: docker compose --env-file .env.prod up -d --build

POSTGRES_DB=chess_school
POSTGRES_USER=chess
POSTGRES_PASSWORD=${DB_PASS}
DATABASE_URL=postgres://chess:${DB_PASS_ENCODED}@db:5432/chess_school

JWT_SECRET=${JWT_SECRET}
JWT_REFRESH_SECRET=${JWT_REFRESH_SECRET}

AWS_ACCESS_KEY_ID=${AWS_KEY}
AWS_SECRET_ACCESS_KEY=${AWS_SECRET}
AWS_REGION=${AWS_REGION}
AWS_S3_BUCKET=${AWS_BUCKET}
AWS_S3_CDN_URL=${AWS_CDN}

TELEGRAM_BOT_TOKEN=
EOF

echo "==> $OUT yaratildi."
echo "    JWT_SECRET va JWT_REFRESH_SECRET avtomatik generatsiya qilindi."
echo "    TELEGRAM_BOT_TOKEN ni kerak bo'lsa qo'shing."
