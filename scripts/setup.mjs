// `npm run setup`: one-time local setup.
// Creates .env (with a random local DB password) if missing, starts the local
// database, applies migrations and loads the demonstration catalog.
import fs from "node:fs";
import crypto from "node:crypto";
import { spawnSync } from "node:child_process";

const isWin = process.platform === "win32";
const npx = isWin ? "npx.cmd" : "npx";

if (!fs.existsSync(".env")) {
  const pw = crypto.randomBytes(18).toString("hex");
  const example = fs.readFileSync(".env.example", "utf8").replaceAll("CHANGE_ME_LOCAL_DB_PASSWORD", pw);
  fs.writeFileSync(".env", example);
  console.log("[setup] Created .env with a random local database password.");
}

const { startLocalDb } = await import("./local-db.mjs");
const stopDb = await startLocalDb();

function run(args) {
  const r = spawnSync(npx, args, { stdio: "inherit", shell: isWin });
  if (r.status !== 0) throw new Error(`Command failed: npx ${args.join(" ")}`);
}

try {
  run(["prisma", "migrate", "deploy"]);
  run(["prisma", "generate"]);
  run(["tsx", "prisma/seed.ts"]);
  console.log("\n[setup] Done. Next steps:");
  console.log("  1. Create the first admin:  npm run admin:create");
  console.log("  2. Start the app:           npm run dev");
} finally {
  await stopDb();
}
