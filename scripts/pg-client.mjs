// Opens a Postgres connection from DATABASE_URL, scoped to DATABASE_SCHEMA when it is set.
import pg from "pg";

export async function connect() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL não definido.");
  const schema = process.env.DATABASE_SCHEMA || "";
  if (schema && !/^[a-z_][a-z0-9_]*$/.test(schema)) throw new Error("DATABASE_SCHEMA inválido: use letras minúsculas, números e _.");
  const client = new pg.Client({ connectionString: process.env.DATABASE_URL, options: schema ? `-c search_path=${schema}` : undefined });
  await client.connect();
  return { client, schema };
}
