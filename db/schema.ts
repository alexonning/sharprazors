import {sqliteTable,text,integer,index} from "drizzle-orm/sqlite-core";
export const bookings=sqliteTable("bookings",{id:text("id").primaryKey(),date:text("date").notNull(),start:integer("start").notNull(),end:integer("end").notNull(),service:text("service").notNull(),name:text("name").notNull(),phone:text("phone").notNull(),createdAt:text("created_at").notNull()},t=>[index("idx_bookings_date_start").on(t.date,t.start),index("idx_bookings_phone").on(t.phone)]);

export const customers=sqliteTable("customers",{phone:text("phone").primaryKey(),name:text("name").notNull(),createdAt:text("created_at").notNull()});
