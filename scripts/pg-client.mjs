// Opens a Postgres connection from DATABASE_URL, scoped to DATABASE_SCHEMA when it is set.
import pg from "pg";
import { readFileSync } from "node:fs";
import { postgresConfig, openPostgresClient } from "../db/postgres-config.mjs";

export async function connect() {
  const rootCertificate = readFileSync(new URL("../db/supabase-prod-ca-2021.crt", import.meta.url), "utf8");
  const { schema, clientConfig } = postgresConfig(process.env.DATABASE_URL, process.env.DATABASE_SCHEMA, rootCertificate);
  const client = new pg.Client(clientConfig);
  await openPostgresClient(client, schema);
  return { client, schema };
}
