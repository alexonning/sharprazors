import { readFileSync, writeFileSync } from "node:fs";
import { postgresConfig } from "../db/postgres-config.mjs";

const rootCertificate = readFileSync(new URL("../db/supabase-prod-ca-2021.crt", import.meta.url), "utf8");
const { schema, clientConfig } = postgresConfig(process.env.DATABASE_URL, process.env.DATABASE_SCHEMA, rootCertificate);
// JSON quoting protects special characters in secrets when Wrangler reads dotenv.
writeFileSync(new URL("../dist/server/.dev.vars", import.meta.url),
  `DATABASE_URL=${JSON.stringify(clientConfig.connectionString)}\nDATABASE_SCHEMA=${JSON.stringify(schema)}\n`,
  { mode: 0o600 });
