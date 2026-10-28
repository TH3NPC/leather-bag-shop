/**
 * Creates (or resets the password of) an admin account. There is no web sign-up page.
 *
 *   npm run admin:create -- --email owner@example.com --name "Shop Owner"
 *   npm run admin:create -- --email staff@example.com --name "Staff" --role staff
 *
 * The password is typed at a hidden prompt (or supplied via the ADMIN_PASSWORD
 * environment variable for automation). It is stored only as a scrypt hash.
 * Against production, run it with DATABASE_URL pointing at the production database.
 */
import "dotenv/config";
import readline from "node:readline";
import { PrismaClient } from "@prisma/client";
import { hashPassword, MIN_PASSWORD_LENGTH } from "../src/lib/password";

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

function promptHidden(question: string): Promise<string> {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    const out = rl as unknown as { _writeToOutput: (s: string) => void; output: NodeJS.WriteStream };
    let muted = false;
    out._writeToOutput = (s: string) => { if (!muted) out.output.write(s); };
    rl.question(question, (answer) => { rl.close(); process.stdout.write("\n"); resolve(answer); });
    muted = true;
  });
}

async function main() {
  const email = arg("email")?.trim().toLowerCase();
  const name = arg("name")?.trim() || "Shop owner";
  const role = (arg("role") ?? "owner").toUpperCase();
  if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw new Error('Usage: npm run admin:create -- --email you@example.com --name "Your Name" [--role owner|staff]');
  if (role !== "OWNER" && role !== "STAFF") throw new Error("--role must be owner or staff");

  let password = process.env.ADMIN_PASSWORD ?? "";
  if (!password) {
    password = await promptHidden(`Password for ${email} (min ${MIN_PASSWORD_LENGTH} characters): `);
    const again = await promptHidden("Repeat password: ");
    if (password !== again) throw new Error("Passwords do not match.");
  }
  if (password.length < MIN_PASSWORD_LENGTH) throw new Error(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`);

  const db = new PrismaClient();
  try {
    const passwordHash = await hashPassword(password);
    const existing = await db.adminUser.findUnique({ where: { email } });
    await db.adminUser.upsert({
      where: { email },
      update: { passwordHash, name, role: role as "OWNER" | "STAFF", active: true },
      create: { email, name, passwordHash, role: role as "OWNER" | "STAFF" },
    });
    if (existing) await db.adminSession.deleteMany({ where: { adminId: existing.id } });
    console.log(existing ? `Updated ${email} (password reset, all sessions signed out).` : `Created ${role.toLowerCase()} account ${email}.`);
  } finally {
    await db.$disconnect();
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
