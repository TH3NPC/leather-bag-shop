// Local PostgreSQL without Docker, using the `embedded-postgres` package.
// It runs real PostgreSQL binaries from node_modules, with data stored in ./.pgdata.
import fs from "node:fs";
import path from "node:path";
import net from "node:net";
import "dotenv/config";
import EmbeddedPostgres from "embedded-postgres";

const DATA_DIR = path.resolve(".pgdata");

export function dbConfig() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is missing. Run `npm run setup` or copy .env.example to .env.");
  const parsed = new URL(url);
  return {
    user: decodeURIComponent(parsed.username),
    password: process.env.LOCAL_DB_PASSWORD || decodeURIComponent(parsed.password),
    port: Number(process.env.LOCAL_DB_PORT || parsed.port || 5433),
    database: parsed.pathname.replace(/^\//, ""),
  };
}

function portInUse(port) {
  return new Promise((resolve) => {
    const socket = net.connect({ port, host: "127.0.0.1" });
    socket.once("connect", () => { socket.destroy(); resolve(true); });
    socket.once("error", () => resolve(false));
  });
}

/** Starts the local database. Returns a stop() function (no-op if it was already running). */
export async function startLocalDb({ quiet = false } = {}) {
  const cfg = dbConfig();
  if (await portInUse(cfg.port)) {
    if (!quiet) console.log(`[db] PostgreSQL already listening on port ${cfg.port}, reusing it.`);
    return async () => {};
  }

  const pg = new EmbeddedPostgres({
    databaseDir: DATA_DIR,
    user: cfg.user,
    password: cfg.password,
    port: cfg.port,
    persistent: true,
    onLog: () => {},
    onError: (msg) => { if (!quiet) console.error("[db]", String(msg).trim()); },
  });

  const fresh = !fs.existsSync(path.join(DATA_DIR, "PG_VERSION"));
  if (fresh) {
    console.log("[db] Creating local database cluster in .pgdata ...");
    await pg.initialise();
  }
  await pg.start();
  if (fresh) {
    await pg.createDatabase(cfg.database);
  } else {
    // Safe if the database already exists.
    await pg.createDatabase(cfg.database).catch(() => {});
  }
  if (!quiet) console.log(`[db] PostgreSQL running on localhost:${cfg.port} (database "${cfg.database}")`);

  let stopped = false;
  return async () => {
    if (stopped) return;
    stopped = true;
    await pg.stop();
    if (!quiet) console.log("[db] PostgreSQL stopped.");
  };
}
