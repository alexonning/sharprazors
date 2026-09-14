declare namespace Cloudflare {
  interface Env {
    DB?: D1Database;
    DATABASE_URL?: string;
    DATABASE_SCHEMA?: string;
    BUCKET?: R2Bucket;
  }
}
