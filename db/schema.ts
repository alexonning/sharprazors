import {sqliteTable,text,integer,index} from "drizzle-orm/sqlite-core";
export const bookings=sqliteTable("bookings",{id:text("id").primaryKey(),date:text("date").notNull(),start:integer("start").notNull(),end:integer("end").notNull(),service:text("service").notNull(),name:text("name").notNull(),phone:text("phone").notNull(),status:text("status").notNull().default("agendado"),barber:text("barber").notNull().default("qualquer"),serviceName:text("service_name"),barberName:text("barber_name"),durationMinutes:integer("duration_minutes"),priceCents:integer("price_cents"),snapshotVersion:integer("snapshot_version").notNull().default(0),createdAt:text("created_at").notNull()},t=>[index("idx_bookings_date_start").on(t.date,t.start),index("idx_bookings_phone").on(t.phone)]);

export const customers=sqliteTable("customers",{phone:text("phone").primaryKey(),name:text("name").notNull(),createdAt:text("created_at").notNull()});

// Site settings edited in /admin: contact, hours, booking window and minimum advance time.
export const settings=sqliteTable("settings",{key:text("key").primaryKey(),value:text("value").notNull()});

export const services=sqliteTable("services",{id:text("id").primaryKey(),name:text("name").notNull(),duration:integer("duration").notNull(),priceCents:integer("price_cents"),position:integer("position").notNull().default(0),active:integer("active").notNull().default(1)});

// Temporary absences: no bookings on `date` between `start` and `end` (minutes since midnight).
export const scheduleBlocks=sqliteTable("schedule_blocks",{id:text("id").primaryKey(),date:text("date").notNull(),start:integer("start").notNull(),end:integer("end").notNull(),reason:text("reason").notNull().default(""),createdAt:text("created_at").notNull()},t=>[index("idx_schedule_blocks_date").on(t.date)]);

// Blacklist: customers with these phones (normalized, 55-prefixed) cannot book.
export const blockedPhones=sqliteTable("blocked_phones",{phone:text("phone").primaryKey(),reason:text("reason").notNull().default(""),createdAt:text("created_at").notNull()});

export const adminUsers=sqliteTable("admin_users",{username:text("username").primaryKey(),passwordHash:text("password_hash").notNull(),updatedAt:text("updated_at").notNull()});

export const adminSessions=sqliteTable("admin_sessions",{tokenHash:text("token_hash").primaryKey(),username:text("username").notNull(),expiresAt:text("expires_at").notNull()});

export const barbers=sqliteTable("barbers",{id:text("id").primaryKey(),name:text("name").notNull(),active:integer("active").notNull().default(1),position:integer("position").notNull().default(0),createdAt:text("created_at").notNull()});
