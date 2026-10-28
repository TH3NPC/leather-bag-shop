# Leather bag shop — Telegram Mini App + admin

A Telegram Mini App storefront and admin dashboard for a leather bag shop in Ethiopia.
Prices are in Ethiopian Birr (ETB) and business dates use Addis Ababa time.

> Status: work in progress. The customer storefront (catalog, product pages, cart,
> checkout, order tracking) is complete. The admin dashboard is being built next.
> The shop name "Leather Atelier" and all products with `DEMO-` SKUs are placeholder
> demonstration data to be replaced by the owner.

## Stack

- **Next.js 15** (App Router, TypeScript) — storefront, admin and API in one app
- **PostgreSQL** with **Prisma** — migrations in `prisma/migrations`, seed in `prisma/seed.ts`
- **Tailwind CSS 4**, **Lucide** icons, **Zod** validation
- Local development uses a bundled PostgreSQL (`embedded-postgres`), so **Docker is not needed**

## Run locally (Windows, macOS, Linux)

Requires Node.js 20+.

```bash
npm install
npm run setup      # creates .env, starts the local database, migrates and seeds demo products
npm run dev        # starts the database + app
```

Then open http://localhost:3000. `npm run dev` also prints a LAN address for testing from a phone
on the same Wi-Fi (allow Node.js through Windows Firewall on *private* networks if prompted).

Configuration lives in `.env` (never committed). See [`.env.example`](.env.example) for every variable.

## Deploying to Vercel

1. Import this GitHub repository in Vercel (or `vercel link`).
2. Add a PostgreSQL database (Vercel → Storage → Neon, free tier) and connect it to the project.
   It sets `DATABASE_URL` automatically.
3. Set the other environment variables from `.env.example` (`APP_URL`, `TELEGRAM_BOT_TOKEN`,
   `TELEGRAM_ADMIN_CHAT_ID`). The bot token is server-side only.
4. Deploy. The `vercel-build` script applies database migrations before building.
5. Load the demo catalog once: `DATABASE_URL=<production url> npm run db:seed`.

## Payments

No payment gateway is integrated. Orders are placed as **pending** with **unpaid** status and the shop
confirms payment manually (cash on delivery/pickup, bank transfer, or Telebirr transfer to the shop's
number). Chapa and Telebirr API integrations are not implemented and are not offered at checkout.

## Stock policy

Stock is reserved when a customer places an order (atomic conditional update; a database CHECK
constraint prevents negative stock). Cancelling an order returns the stock exactly once.
Other status changes never touch stock.

## Photography

Demo product photos are from [Unsplash](https://unsplash.com/license) and should be replaced with the
shop's own photography.
