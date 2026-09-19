-- Postgres schema used when DATABASE_URL is set (Render). Mirrors db/schema.ts and is safe to run on every start.
CREATE TABLE IF NOT EXISTS bookings (id text PRIMARY KEY, date text NOT NULL, start integer NOT NULL, "end" integer NOT NULL, service text NOT NULL, name text NOT NULL, phone text NOT NULL, status text NOT NULL DEFAULT 'agendado', created_at text NOT NULL);
CREATE INDEX IF NOT EXISTS idx_bookings_date_start ON bookings (date, start);
CREATE INDEX IF NOT EXISTS idx_bookings_phone ON bookings (phone);
CREATE TABLE IF NOT EXISTS customers (phone text PRIMARY KEY, name text NOT NULL, created_at text NOT NULL);
CREATE TABLE IF NOT EXISTS settings (key text PRIMARY KEY, value text NOT NULL);
CREATE TABLE IF NOT EXISTS services (id text PRIMARY KEY, name text NOT NULL, duration integer NOT NULL, price_cents integer, position integer NOT NULL DEFAULT 0, active integer NOT NULL DEFAULT 1);
CREATE TABLE IF NOT EXISTS schedule_blocks (id text PRIMARY KEY, date text NOT NULL, start integer NOT NULL, "end" integer NOT NULL, reason text NOT NULL DEFAULT '', created_at text NOT NULL);
CREATE INDEX IF NOT EXISTS idx_schedule_blocks_date ON schedule_blocks (date);
CREATE TABLE IF NOT EXISTS blocked_phones (phone text PRIMARY KEY, reason text NOT NULL DEFAULT '', created_at text NOT NULL);
CREATE TABLE IF NOT EXISTS admin_users (username text PRIMARY KEY, password_hash text NOT NULL, updated_at text NOT NULL);
CREATE TABLE IF NOT EXISTS admin_sessions (token_hash text PRIMARY KEY, username text NOT NULL, expires_at text NOT NULL);

-- Add status column to bookings if missing (idempotent for existing databases).
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'agendado';
UPDATE bookings SET status='agendado' WHERE status IS NULL;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS barber text NOT NULL DEFAULT 'qualquer';

-- Barbers table
CREATE TABLE IF NOT EXISTS barbers (id text PRIMARY KEY, name text NOT NULL, active integer NOT NULL DEFAULT 1, position integer NOT NULL DEFAULT 0, created_at text NOT NULL);
INSERT INTO barbers (id, name, active, position, created_at) VALUES
  ('qualquer', 'Qualquer disponível', 1, 0, '2026-09-17T00:00:00.000Z')
ON CONFLICT (id) DO NOTHING;

-- Immutable booking details. Existing prices cannot be reconstructed from today's catalog.
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS service_name text;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS barber_name text;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS duration_minutes integer;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS price_cents integer;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS snapshot_version integer NOT NULL DEFAULT 0;
UPDATE bookings SET
  service_name=COALESCE(service_name,(SELECT name FROM services WHERE services.id=bookings.service),service),
  barber_name=COALESCE(barber_name,(SELECT name FROM barbers WHERE barbers.id=bookings.barber),barber),
  duration_minutes=COALESCE(duration_minutes,"end"-start)
WHERE service_name IS NULL OR barber_name IS NULL OR duration_minutes IS NULL;

-- Defaults for a new database only; existing rows (including ones edited in /admin) are never overwritten.
INSERT INTO services (id, name, duration, price_cents, position, active) VALUES
  ('corte', 'Corte de cabelo', 30, NULL, 0, 1),
  ('barba', 'Barba', 30, NULL, 1, 1),
  ('combo', 'Corte + barba', 60, NULL, 2, 1)
ON CONFLICT (id) DO NOTHING;
INSERT INTO settings (key, value) VALUES
  ('whatsapp', '5546999073974'),
  ('phone', '5546999073974'),
  ('hours', '[{"closed":true,"periods":[]},{"closed":false,"periods":[[480,690],[810,1170]]},{"closed":false,"periods":[[480,690],[810,1170]]},{"closed":false,"periods":[[480,690],[810,1170]]},{"closed":false,"periods":[[480,690],[810,1170]]},{"closed":false,"periods":[[480,690],[810,1170]]},{"closed":false,"periods":[[480,690],[810,1020]]}]')
ON CONFLICT (key) DO NOTHING;
