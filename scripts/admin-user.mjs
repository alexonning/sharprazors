// Creates or resets an /admin login. Uses Postgres when DATABASE_URL is set, otherwise the local D1 state.
// Usage: node scripts/admin-user.mjs <username> <password>        (resets the password if the user exists)
//        ADMIN_USERNAME=... ADMIN_PASSWORD=... node scripts/admin-user.mjs --if-missing
//        (startup bootstrap: creates the user once and never overwrites a password changed in /admin)
import { pbkdf2Sync, randomBytes } from "node:crypto";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const args = process.argv.slice(2);
const ifMissing = args.includes("--if-missing");
const [argUser, argPassword] = args.filter((arg) => arg !== "--if-missing");
const username = (argUser ?? process.env.ADMIN_USERNAME ?? "").trim();
const password = argPassword ?? process.env.ADMIN_PASSWORD ?? "";
if (!username || password.length < 1) {
  console.error("Uso: node scripts/admin-user.mjs <usuario> <senha não vazia>");
  process.exit(1);
}

// Must match lib/admin-auth.ts: pbkdf2$<iterations>$<salt base64>$<hash base64>, SHA-256, 32 bytes.
const iterations = 100000, salt = randomBytes(16);
const hash = `pbkdf2$${iterations}$${salt.toString("base64")}$${pbkdf2Sync(password, salt, iterations, 32, "sha256").toString("base64")}`;
const now = new Date().toISOString();
const onConflict = ifMissing ? "DO NOTHING" : "DO UPDATE SET password_hash=excluded.password_hash,updated_at=excluded.updated_at";

let changes = null;
if (process.env.DATABASE_URL) {
  const { connect } = await import("./pg-client.mjs");
  const { client } = await connect();
  try {
    const result = await client.query(`INSERT INTO admin_users (username,password_hash,updated_at) VALUES ($1,$2,$3) ON CONFLICT(username) ${onConflict}`, [username, hash, now]);
    changes = result.rowCount;
  } finally {
    await client.end();
  }
} else {
  const quote = (value) => `'${value.replace(/'/g, "''")}'`;
  const sql = `INSERT INTO admin_users (username,password_hash,updated_at) VALUES (${quote(username)},${quote(hash)},${quote(now)}) ON CONFLICT(username) ${onConflict};`;
  const result = spawnSync(process.execPath, [
    "--import", "./scripts/sites-env.mjs", "./node_modules/wrangler/bin/wrangler.js",
    "d1", "execute", "DB", "--local", "--config", "dist/server/wrangler.json", "--persist-to", ".wrangler/state", "--command", sql,
  ], { stdio: ["ignore", "ignore", "inherit"], cwd: fileURLToPath(new URL("..", import.meta.url)) });
  if (result.status !== 0) process.exit(result.status ?? 1);
}
console.log(ifMissing && changes === 0 ? `Usuário "${username}" já existe; senha mantida.` : `Acesso ao /admin salvo para o usuário "${username}".`);
