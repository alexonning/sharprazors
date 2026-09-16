import test from "node:test";
import assert from "node:assert/strict";
import { postgresConfig, openPostgresClient } from "../db/postgres-config.mjs";

const url = "postgresql://postgres.example:password@aws-0-example.pooler.supabase.com:5432/postgres";
const ca = "test-certificate";
test("Supabase defaults to an isolated schema and verified TLS", () => {
  const config = postgresConfig(url, undefined, ca);
  assert.equal(config.schema, "sharprazors");
  assert.equal(config.clientConfig.ssl.ca, ca);
  assert.equal(config.clientConfig.ssl.rejectUnauthorized, true);
  assert.equal(new URL(config.clientConfig.connectionString).searchParams.has("sslmode"), false);
  assert.equal(postgresConfig(url, "custom_schema", ca).schema, "custom_schema");
});
test("rejects invalid configuration before connecting", () => {
  for (const [connection, schema] of [[undefined], ["https://example.com"],
    [url, "public; DROP SCHEMA public"], [url, ""], [url, "x".repeat(64)],
    [url.replace(":5432", ":6543")], [url + "?sslmode=disable"]]) {
    assert.throws(() => postgresConfig(connection, schema, ca));
  }
});
test("preserves existing generic PostgreSQL connections", () => {
  const config = postgresConfig("postgres://user:password@localhost:5432/app", undefined, ca);
  assert.equal(config.schema, "");
  assert.equal(new URL(config.clientConfig.connectionString).searchParams.has("sslmode"), false);
});
test("sets schema after connecting, as required by Session Pooler", async () => {
  const calls = [];
  await openPostgresClient({
    connect: async () => calls.push("connect"),
    query: async (...args) => calls.push(args),
    end: async () => calls.push("end"),
  }, "sharprazors");
  assert.deepEqual(calls, ["connect", ["SELECT set_config('search_path', $1, false)", ["sharprazors"]]]);
});
test("closes the connection if schema initialization fails", async () => {
  let closed = false;
  await assert.rejects(openPostgresClient({
    connect: async () => {},
    query: async () => { throw new Error("failed"); },
    end: async () => { closed = true; },
  }, "sharprazors"), /failed/);
  assert.equal(closed, true);
});
