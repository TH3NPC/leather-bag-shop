// Runs only the local database until Ctrl+C. Useful for Prisma Studio or migrations.
import { startLocalDb } from "./local-db.mjs";

const stop = await startLocalDb();
console.log("[db] Press Ctrl+C to stop.");
const shutdown = async () => { await stop(); process.exit(0); };
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
setInterval(() => {}, 1 << 30);
