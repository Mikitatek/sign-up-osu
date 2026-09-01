#!/usr/bin/env bash
#
# Server-side deploy script for srv1 (HestiaCP).
# Run ON THE SERVER as the Hestia web user, from the app root:
#
#   ssh miki@srv1.mikitatek.ro
#   cd ~/web/batranul-osu.ro/app && ./deploy.sh
#
# composer.json pins the platform to PHP 8.3, so artisan/composer must run on
# 8.3 even though the box also has 8.4. Override if needed:  PHP=/usr/bin/php8.3 ./deploy.sh

set -euo pipefail
cd "$(dirname "$0")"

PHP="${PHP:-/usr/bin/php8.3}"
COMPOSER="${COMPOSER:-/usr/local/bin/composer}"

echo "=== deploy: $(date) ==="
echo "php: $("$PHP" -r 'echo PHP_VERSION;')"

"$PHP" artisan down --retry=15 || true
trap '"$PHP" artisan up || true' EXIT

# --ff-only refuses surprise merge commits; deploys must be clean fast-forwards.
git pull --ff-only

"$PHP" "$COMPOSER" install --no-dev --optimize-autoloader --no-interaction

npm ci --no-audit --no-fund
npm run build

"$PHP" artisan migrate --force
"$PHP" artisan storage:link || true

"$PHP" artisan config:cache
"$PHP" artisan route:cache
"$PHP" artisan view:cache
"$PHP" artisan queue:restart

"$PHP" artisan up
trap - EXIT

echo "=== deploy OK: $(git rev-parse --short HEAD) ==="
