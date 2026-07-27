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
