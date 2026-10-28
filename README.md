# Leather bag shop — Telegram Mini App + admin

A Telegram Mini App storefront and admin dashboard for a leather bag shop in Ethiopia.
Prices are in Ethiopian Birr (ETB) and business dates use Addis Ababa time.

- **Live shop:** https://leather-bag-shop.vercel.app
- **Admin:** https://leather-bag-shop.vercel.app/admin

The shop name "Leather Atelier" and all products with `DEMO-` SKUs are placeholder
demonstration data to be replaced by the owner (Admin → Settings / Products).

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

## Admin accounts

There is no public sign-up and no default password. Create the first owner account from a terminal:

```bash
npm run admin:create -- --email you@example.com --name "Your Name"
```

You are asked for the password at a hidden prompt (minimum 10 characters); only a scrypt hash is
stored. Running the command again for the same email resets the password and signs out all sessions.
Add `--role staff` for staff accounts: staff can manage orders, products and inventory, while only
owners can see expenses, profit and settings. To manage accounts on the live site, run the same
command with `DATABASE_URL` set to the production database (`vercel env pull`).

## Telegram

1. In [@BotFather](https://t.me/BotFather): `/mybots` → your bot → *Bot Settings* → *Configure Mini App*
   (or *Menu Button*) and set the URL to `https://leather-bag-shop.vercel.app`.
2. Set `TELEGRAM_BOT_TOKEN` and `TELEGRAM_ADMIN_CHAT_ID` in Vercel (server-side only).
3. Open the bot and press **Start** once, otherwise the bot is not allowed to message you.

Inside Telegram the app verifies the signed `initData` on the server before linking an order to a
Telegram user, uses Telegram's native back button and matches its header colours. New orders are
sent to the admin chat; customers who opened the shop from Telegram get status updates.
Telegram requires HTTPS, so the Mini App cannot be opened in Telegram from `localhost`.

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
