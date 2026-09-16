// Creates the Postgres schema, tables and default data (idempotent). Runs on Render before the Worker starts.
import { readFileSync } from "node:fs";
import { connect } from "./pg-client.mjs";

const { client, schema } = await connect();
try {
  await client.query("BEGIN");
  if (schema) await client.query(`CREATE SCHEMA IF NOT EXISTS "${schema}"`);
  await client.query(readFileSync(new URL("../db/postgres.sql", import.meta.url), "utf8"));
  await client.query("COMMIT");
  console.log(`Banco Postgres pronto${schema ? ` (schema ${schema})` : ""}.`);
} catch (error) {
  await client.query("ROLLBACK").catch(() => {});
  throw error;
} finally {
  await client.end();
}
