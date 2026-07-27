#!/usr/bin/env bash
# Construiește arhiva de deploy pentru cPanel (upload prin File Manager).
# Rulează din rădăcina proiectului:  bash scripts/build-cpanel-package.sh
set -euo pipefail

cd "$(dirname "$0")/.."
OUT="osu-cpanel-$(date +%Y%m%d-%H%M).zip"

echo "==> Build assets (npm run build)"
npm run build

echo "==> Vendor de producție (composer install --no-dev)"
composer install --no-dev --optimize-autoloader --quiet

echo "==> Împachetez ${OUT}"
rm -f osu-cpanel-*.zip
zip -qr "$OUT" \
    .htaccess .env.cpanel.example artisan composer.json composer.lock \
    app bootstrap config database public resources routes storage vendor \
    -x "storage/logs/*" \
    -x "storage/framework/cache/data/*" \
    -x "storage/framework/sessions/*" \
    -x "storage/framework/views/*" \
    -x "database/*.sqlite" \
    -x "public/hot"

echo "==> Reinstalez dependențele de dezvoltare local"
composer install --quiet

echo ""
echo "Gata: ${OUT}"
echo "Urmează pașii din DEPLOY_CPANEL.md."
