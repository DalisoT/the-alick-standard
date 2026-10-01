/**
 * Idempotent schema bootstrapper — runs at server startup to ensure the
 * SQLite database has all required tables.
 */
import { sqliteConn } from "./index";

// Each statement is run individually (libsql execute accepts a single SQL string).
const STATEMENTS: string[] = [
  `CREATE TABLE IF NOT EXISTS admin_users (
    id TEXT PRIMARY KEY,
    username TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    display_name TEXT NOT NULL,
    created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
  )`,
  `CREATE TABLE IF NOT EXISTS customers (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    email TEXT,
    address TEXT,
    notes TEXT,
    total_bookings INTEGER NOT NULL DEFAULT 0,
    completed_bookings INTEGER NOT NULL DEFAULT 0,
    lifetime_spend INTEGER NOT NULL DEFAULT 0,
    last_visit INTEGER,
    created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
  )`,
  `CREATE INDEX IF NOT EXISTS customers_phone_idx ON customers(phone)`,
  `CREATE TABLE IF NOT EXISTS services (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    duration_minutes INTEGER NOT NULL,
    price_ngwee INTEGER NOT NULL,
    type TEXT NOT NULL DEFAULT 'both',
    active INTEGER NOT NULL DEFAULT 1,
    display_order INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
  )`,
  `CREATE TABLE IF NOT EXISTS availability_rules (
    id TEXT PRIMARY KEY,
    day_of_week INTEGER NOT NULL,
    start_minutes INTEGER NOT NULL,
    end_minutes INTEGER NOT NULL,
    active INTEGER NOT NULL DEFAULT 1
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS availability_day_idx ON availability_rules(day_of_week)`,
  `CREATE TABLE IF NOT EXISTS availability_blocks (
    id TEXT PRIMARY KEY,
    date TEXT NOT NULL,
    start_minutes INTEGER NOT NULL,
    end_minutes INTEGER NOT NULL,
    reason TEXT NOT NULL DEFAULT ''
  )`,
  `CREATE TABLE IF NOT EXISTS appointments (
    id TEXT PRIMARY KEY,
    booking_ref TEXT NOT NULL UNIQUE,
    customer_id TEXT NOT NULL REFERENCES customers(id),
    service_id TEXT NOT NULL REFERENCES services(id),
    type TEXT NOT NULL,
    scheduled_at INTEGER NOT NULL,
    duration_minutes INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    address TEXT,
    customer_notes TEXT,
    service_price_ngwee INTEGER NOT NULL,
    travel_fee_ngwee INTEGER NOT NULL DEFAULT 0,
    total_ngwee INTEGER NOT NULL,
    admin_notes TEXT,
    source TEXT NOT NULL DEFAULT 'online',
    created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
    updated_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
  )`,
  `CREATE INDEX IF NOT EXISTS appts_scheduled_idx ON appointments(scheduled_at)`,
  `CREATE INDEX IF NOT EXISTS appts_status_idx ON appointments(status)`,
  `CREATE INDEX IF NOT EXISTS appts_customer_idx ON appointments(customer_id)`,
  `CREATE TABLE IF NOT EXISTS business_settings (
    id TEXT PRIMARY KEY DEFAULT 'singleton',
    business_name TEXT NOT NULL DEFAULT 'THE ALICK STANDARD',
    tagline TEXT NOT NULL DEFAULT 'More Than a Cut. It''s the Standard.',
    shop_address TEXT NOT NULL DEFAULT '',
    shop_phone TEXT NOT NULL DEFAULT '',
    whatsapp_number TEXT NOT NULL DEFAULT '',
    default_travel_fee_ngwee INTEGER NOT NULL DEFAULT 5000,
    slot_interval_minutes INTEGER NOT NULL DEFAULT 30,
    notifications_enabled INTEGER NOT NULL DEFAULT 1,
    notify_on_booking_received INTEGER NOT NULL DEFAULT 1,
    notify_on_booking_confirmed INTEGER NOT NULL DEFAULT 1,
    notify_on_booking_cancelled INTEGER NOT NULL DEFAULT 1,
    notify_on_appointment_reminder INTEGER NOT NULL DEFAULT 1,
    notify_on_appointment_completed INTEGER NOT NULL DEFAULT 0
  )`,
  `CREATE TABLE IF NOT EXISTS expenses (
    id TEXT PRIMARY KEY,
    amount_ngwee INTEGER NOT NULL,
    category TEXT NOT NULL DEFAULT 'general',
    description TEXT NOT NULL DEFAULT '',
    incurred_at INTEGER NOT NULL,
    created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
  )`,
  `CREATE INDEX IF NOT EXISTS expenses_incurred_idx ON expenses(incurred_at)`,
  `CREATE TABLE IF NOT EXISTS notification_log (
    id TEXT PRIMARY KEY,
    appointment_id TEXT,
    type TEXT NOT NULL,
    channel TEXT NOT NULL DEFAULT 'whatsapp',
    recipient TEXT NOT NULL,
    payload TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'queued',
    created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
  )`,
];

let bootstrapped = false;

export async function ensureSchema() {
  if (bootstrapped) return;
  for (const sql of STATEMENTS) {
    await sqliteConn.execute(sql);
  }
  bootstrapped = true;
}