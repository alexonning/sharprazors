// Checks credentials, TLS verification, and schema visibility without reading application data.
import { connect } from "./pg-client.mjs";

const { client, schema } = await connect();
try {
  const result = await client.query(
    "SELECT current_database() AS database, current_schema() AS schema, (SELECT count(*) FROM information_schema.tables WHERE table_schema = $1) AS tables",
    [schema],
  );
  const { database, schema: currentSchema, tables } = result.rows[0];
  console.log(JSON.stringify({ connected: true, database, schema: currentSchema, tables: Number(tables) }));
} finally {
  await client.end();
}
