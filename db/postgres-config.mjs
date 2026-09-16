// Shared by the Worker, migrations and admin bootstrap. Never log the URL.
export function postgresConfig(connectionString, databaseSchema, rootCertificate) {
  if (!connectionString) throw new Error("DATABASE_URL não definido.");
  let url;
  try { url = new URL(connectionString); } catch {
    throw new Error("DATABASE_URL deve ser uma URL PostgreSQL válida.");
  }
  if (!["postgres:", "postgresql:"].includes(url.protocol)) {
    throw new Error("DATABASE_URL deve usar postgres:// ou postgresql://.");
  }
  const supabase = /\.(supabase\.co|supabase\.com)$/.test(url.hostname);
  if (supabase && url.port === "6543") {
    throw new Error("Use o Session Pooler do Supabase (porta 5432), pois a aplicação usa um schema por sessão.");
  }
  const schema = databaseSchema ?? (supabase ? "sharprazors" : "");
  if (schema && !/^[a-z_][a-z0-9_]{0,62}$/.test(schema)) {
    throw new Error("DATABASE_SCHEMA inválido: use até 63 letras minúsculas, números e _.");
  }
  if (supabase && !schema) throw new Error("Defina DATABASE_SCHEMA para isolar as tabelas no Supabase.");
  const sslMode = url.searchParams.get("sslmode") ?? "verify-full";
  if (supabase && !["require", "verify-ca", "verify-full"].includes(sslMode)) {
    throw new Error("A conexão ao Supabase exige SSL (sslmode=require ou um modo de verificação de certificado).");
  }
  url.searchParams.delete("sslmode");
  if (supabase && !rootCertificate) throw new Error("Certificado raiz do Supabase indisponível.");
  return {
    schema,
    clientConfig: {
      connectionString: url.toString(),
      connectionTimeoutMillis: 15000,
      ...(supabase ? { ssl: sslMode === "require" ? { ca: rootCertificate, rejectUnauthorized: false } : { ca: rootCertificate, rejectUnauthorized: true } } : {}),
    },
  };
}

export async function openPostgresClient(client, schema) {
  try {
    await client.connect();
    // Supavisor may ignore startup options. Session mode preserves this setting.
    if (schema) await client.query("SELECT set_config('search_path', $1, false)", [schema]);
  } catch (error) {
    await client.end().catch(() => {});
    throw error;
  }
}
