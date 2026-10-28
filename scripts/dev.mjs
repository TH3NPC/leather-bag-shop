// `npm run dev`: starts the local database, applies pending migrations, then runs Next.js.
import { spawn, spawnSync } from "node:child_process";
import os from "node:os";
import { startLocalDb } from "./local-db.mjs";

const isWin = process.platform === "win32";
const npx = isWin ? "npx.cmd" : "npx";

const stopDb = await startLocalDb();

const migrate = spawnSync(npx, ["prisma", "migrate", "deploy"], { stdio: "inherit", shell: isWin });
if (migrate.status !== 0) {
  console.error("[dev] Database migration failed. See the output above.");
  await stopDb();
  process.exit(1);
}

const lanIps = Object.values(os.networkInterfaces())
  .flat()
  .filter((i) => i && i.family === "IPv4" && !i.internal)
  .map((i) => i.address);
console.log("\n  Shop:   http://localhost:3000");
console.log("  Admin:  http://localhost:3000/admin");
for (const ip of lanIps) console.log(`  Phone (same Wi-Fi): http://${ip}:3000`);
console.log("");

const next = spawn(npx, ["next", "dev", "-H", "0.0.0.0", "-p", "3000"], { stdio: "inherit", shell: isWin });

let shuttingDown = false;
const shutdown = async (code = 0) => {
  if (shuttingDown) return;
  shuttingDown = true;
  if (!next.killed) next.kill();
  await stopDb();
  process.exit(code);
};
next.on("exit", (code) => shutdown(code ?? 0));
process.on("SIGINT", () => shutdown(0));
process.on("SIGTERM", () => shutdown(0));
