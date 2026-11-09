# OSU Shop

Laravel 11 + Inertia (React 18) + Tailwind storefront for OSU, with Stripe Checkout
(migration to Netopia planned), a newsletter, and an admin dashboard.

This repo is being evolved into the **API backend** of the OSU delivery platform
(web + iOS/Android apps). See the development plan in the team's Claude project.

## Requirements

Either **Docker Desktop** (recommended, uses Laravel Sail) or a native setup with
PHP 8.2+, Composer, MySQL 8 and Node 20+.

## Quick start (Docker / Sail)

```bash
git clone https://github.com/Mikitatek/sign-up-osu.git
cd sign-up-osu
composer install            # needs local PHP once, to install Sail itself
cp .env.example .env
php artisan key:generate

./vendor/bin/sail up -d     # starts PHP, MySQL, Redis, Mailpit
./vendor/bin/sail artisan migrate --seed
./vendor/bin/sail npm install
./vendor/bin/sail npm run dev
```

The app runs at http://localhost. Mailpit (catches all outgoing mail) is at
http://localhost:8025.

Seeded admin login: `admin@example.com` / `password` (override with
`SEED_ADMIN_*` vars in `.env`).

Tip: add `alias sail='./vendor/bin/sail'` to your shell profile.

## Quick start (native, no Docker)

```bash
composer install
cp .env.example .env        # set DB_HOST=127.0.0.1, REDIS_HOST=127.0.0.1, MAIL_HOST=127.0.0.1
php artisan key:generate
php artisan migrate --seed
npm install
composer run dev            # serves app + queue + logs + vite together
```

## Stripe (test mode)

Set test keys in `.env` — never live keys in development:

```
STRIPE_SECRET=sk_test_...
VITE_STRIPE_KEY=pk_test_...
```

To test webhooks locally once they exist (platform plan, Phase 2), use the
[Stripe CLI](https://docs.stripe.com/stripe-cli):
`stripe listen --forward-to localhost/webhooks/stripe`.

> **Note:** payments are planned to migrate from Stripe to **Netopia** as part
> of the checkout rebuild (Phase 2 of the platform plan).

## Online orders

An order is saved when it is placed (cash) or when Stripe confirms the payment
(card). Staff then accept it at `/dashboard/comenzi`. New-order emails go out
through the queue. While an order stays unaccepted for 5+ minutes,
`orders:alert-unconfirmed` publishes an urgent ntfy notification every 5 minutes.
It uses the same topic and title as the Dante app, so the phone's existing
automation places the call.

Production needs, once, on the server:

1. In `.env`, set `RECAPTCHA_SECRET_KEY` (the secret paired with the widget's
   site key; with `APP_ENV=production` every order is refused until it is set),
   `NTFY_TOPIC` (copy it from Dante's shared `.env`), `ORDER_NOTIFICATION_EMAIL`
   and working `MAIL_*` / `QUEUE_CONNECTION=database`.
2. The scheduler cron, as the site user:

   ```cron
   * * * * * cd /home/miki/web/batranul-osu.ro/app && /usr/bin/php8.3 artisan schedule:run >> storage/logs/schedule.log 2>&1
   ```

3. A queue worker, or the emails stay queued. Hestia disables `pcntl_*` in CLI,
   so the worker needs the same `PHP_INI_SCAN_DIR` override as Dante's. Install
   as `/etc/supervisor/conf.d/osu-worker.conf`:

   ```ini
   [program:osu-worker]
   environment=PHP_INI_SCAN_DIR="/etc/php/8.3/cli/conf.d:/etc/dante/php-worker"
   command=/usr/bin/php8.3 /home/miki/web/batranul-osu.ro/app/artisan queue:work --tries=3 --backoff=10 --max-time=3600
   directory=/home/miki/web/batranul-osu.ro/app
   user=miki
   autostart=true
   autorestart=true
   startsecs=5
   stopwaitsecs=120
   redirect_stderr=true
   stdout_logfile=/home/miki/web/batranul-osu.ro/app/storage/logs/worker.log
   ```

Keep `NTFY_TOPIC` empty locally so development never rings the phone.

## Tests & code style

```bash
php artisan test            # PHPUnit (sqlite in-memory, no setup needed)
./vendor/bin/pint           # fix code style
./vendor/bin/pint --test    # check only (what CI runs)
```

CI runs on every push/PR (`.github/workflows/ci.yml`): Pint, the test suite,
and a production Vite build.

## Project structure notes

- Product catalog currently lives in **Stripe** (products + prices); the local
  `product_visibilities` table only toggles what's shown. Moving the catalog
  into the database is Phase 1 of the platform plan.
- Public registration is **disabled on purpose** — accounts are admin-only until
  customer accounts arrive in Phase 2.
- Admin dashboard routes live under `/dashboard` (auth required).
