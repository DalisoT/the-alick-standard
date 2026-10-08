import { sql } from "drizzle-orm";
import {
  sqliteTable,
  text,
  integer,
  real,
  uniqueIndex,
  index,
} from "drizzle-orm/sqlite-core";

/**
 * THE ALICK STANDARD — Database Schema
 *
 * All times are stored as ISO-8601 strings or epoch ms (see comments).
 * Money is stored in Zambian Kwacha (ZMW) as integer ngwee (1 ZMW = 100 ngwee)
 * to avoid floating point issues. UI converts back to decimal K.
 */

// ─────────────────────────────────────────────────────────────────
// Admin user
// ─────────────────────────────────────────────────────────────────
export const adminUsers = sqliteTable("admin_users", {
  id: text("id").primaryKey(),
  username: text("username").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  displayName: text("display_name").notNull(),
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .notNull()
    .default(sql`(unixepoch() * 1000)`),
});

// ─────────────────────────────────────────────────────────────────
// Customer records (people who have booked, including walk-ins)
// ─────────────────────────────────────────────────────────────────
export const customers = sqliteTable(
  "customers",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    phone: text("phone").notNull(),
    email: text("email"),
    address: text("address"), // last known address (mainly for home service)
    notes: text("notes"),
    totalBookings: integer("total_bookings").notNull().default(0),
    completedBookings: integer("completed_bookings").notNull().default(0),
    lifetimeSpend: integer("lifetime_spend").notNull().default(0), // ngwee
    lastVisit: integer("last_visit", { mode: "timestamp_ms" }),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
  },
  (t) => ({
    phoneIdx: index("customers_phone_idx").on(t.phone),
  }),
);

// ─────────────────────────────────────────────────────────────────
// Service catalogue
// ─────────────────────────────────────────────────────────────────
export const services = sqliteTable("services", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull().default(""),
  durationMinutes: integer("duration_minutes").notNull(),
  priceNgwee: integer("price_ngwee").notNull(), // ngwee
  type: text("type").notNull().default("both"), // "shop" | "home" | "both"
  active: integer("active", { mode: "boolean" }).notNull().default(true),
  displayOrder: integer("display_order").notNull().default(0),
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .notNull()
    .default(sql`(unixepoch() * 1000)`),
});

// ─────────────────────────────────────────────────────────────────
// Weekly availability (one row per day-of-week)
// dayOfWeek: 0 = Sunday … 6 = Saturday
// ─────────────────────────────────────────────────────────────────
export const availabilityRules = sqliteTable(
  "availability_rules",
  {
    id: text("id").primaryKey(),
    dayOfWeek: integer("day_of_week").notNull(), // 0–6
    startMinutes: integer("start_minutes").notNull(), // minutes since 00:00
    endMinutes: integer("end_minutes").notNull(),
    active: integer("active", { mode: "boolean" }).notNull().default(true),
  },
  (t) => ({
    dayIdx: uniqueIndex("availability_day_idx").on(t.dayOfWeek),
  }),
);

// ─────────────────────────────────────────────────────────────────
// One-off date/time blocks (vacations, holidays, personal time)
// ─────────────────────────────────────────────────────────────────
export const availabilityBlocks = sqliteTable("availability_blocks", {
  id: text("id").primaryKey(),
  date: text("date").notNull(), // YYYY-MM-DD
  startMinutes: integer("start_minutes").notNull(),
  endMinutes: integer("end_minutes").notNull(),
  reason: text("reason").notNull().default(""),
});

// ─────────────────────────────────────────────────────────────────
// Appointments
// ─────────────────────────────────────────────────────────────────
export const appointments = sqliteTable(
  "appointments",
  {
    id: text("id").primaryKey(),
    bookingRef: text("booking_ref").notNull().unique(),
    customerId: text("customer_id")
      .notNull()
      .references(() => customers.id),
    serviceId: text("service_id")
      .notNull()
      .references(() => services.id),
    type: text("type").notNull(), // "shop" | "home"
    scheduledAt: integer("scheduled_at", { mode: "timestamp_ms" }).notNull(),
    durationMinutes: integer("duration_minutes").notNull(),
    status: text("status").notNull().default("pending"),
    // pending | confirmed | declined | completed | cancelled | no_show | rescheduled
    address: text("address"), // only set for home
    customerNotes: text("customer_notes"),
    servicePriceNgwee: integer("service_price_ngwee").notNull(), // ngwee
    travelFeeNgwee: integer("travel_fee_ngwee").notNull().default(0),
    totalNgwee: integer("total_ngwee").notNull(),
    adminNotes: text("admin_notes"),
    source: text("source").notNull().default("online"), // online | walk_in | whatsapp
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
  },
  (t) => ({
    scheduledIdx: index("appts_scheduled_idx").on(t.scheduledAt),
    statusIdx: index("appts_status_idx").on(t.status),
    customerIdx: index("appts_customer_idx").on(t.customerId),
  }),
);

// ─────────────────────────────────────────────────────────────────
// Business settings (singleton — id always "singleton")
// ─────────────────────────────────────────────────────────────────
export const businessSettings = sqliteTable("business_settings", {
  id: text("id").primaryKey().default("singleton"),
  businessName: text("business_name").notNull().default("THE ALICK STANDARD"),
  tagline: text("tagline")
    .notNull()
    .default("More Than a Cut. It's the Standard."),
  shopAddress: text("shop_address").notNull().default(""),
  shopPhone: text("shop_phone").notNull().default(""),
  whatsappNumber: text("whatsapp_number").notNull().default(""),
  defaultTravelFeeNgwee: integer("default_travel_fee_ngwee")
    .notNull()
    .default(5000), // K50
  slotIntervalMinutes: integer("slot_interval_minutes").notNull().default(30),
  notificationsEnabled: integer("notifications_enabled", { mode: "boolean" })
    .notNull()
    .default(true),
  // Notification-ready booking states (used by future integration):
  notifyOnBookingReceived: integer("notify_on_booking_received", {
    mode: "boolean",
  })
    .notNull()
    .default(true),
  notifyOnBookingConfirmed: integer("notify_on_booking_confirmed", {
    mode: "boolean",
  })
    .notNull()
    .default(true),
  notifyOnBookingCancelled: integer("notify_on_booking_cancelled", {
    mode: "boolean",
  })
    .notNull()
    .default(true),
  notifyOnAppointmentReminder: integer("notify_on_appointment_reminder", {
    mode: "boolean",
  })
    .notNull()
    .default(true),
  notifyOnAppointmentCompleted: integer("notify_on_appointment_completed", {
    mode: "boolean",
  })
    .notNull()
    .default(false),
});

// ─────────────────────────────────────────────────────────────────
// Expenses
// ─────────────────────────────────────────────────────────────────
export const expenses = sqliteTable(
  "expenses",
  {
    id: text("id").primaryKey(),
    amountNgwee: integer("amount_ngwee").notNull(),
    category: text("category").notNull().default("general"),
    description: text("description").notNull().default(""),
    incurredAt: integer("incurred_at", { mode: "timestamp_ms" }).notNull(),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
  },
  (t) => ({
    incurredIdx: index("expenses_incurred_idx").on(t.incurredAt),
  }),
);

// ─────────────────────────────────────────────────────────────────
// Notification log (records what *would* be sent; future WhatsApp
// integration can consume this table.)
// ─────────────────────────────────────────────────────────────────
export const notificationLog = sqliteTable("notification_log", {
  id: text("id").primaryKey(),
  appointmentId: text("appointment_id"),
  type: text("type").notNull(), // booking_received | booking_confirmed | ...
  channel: text("channel").notNull().default("whatsapp"),
  recipient: text("recipient").notNull(),
  payload: text("payload").notNull(),
  status: text("status").notNull().default("queued"),
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .notNull()
    .default(sql`(unixepoch() * 1000)`),
});

// ─────────────────────────────────────────────────────────────────
// BARBERO MULTI-TENANT EXTENSIONS
// Added 2026-10-08 when pivoting from single-tenant (Alick) to SaaS.
// Every existing row will get a `tenant_id` on the migration script.
// ─────────────────────────────────────────────────────────────────

// Tenants — one row per barbershop subscribed to Barbero.
export const tenants = sqliteTable("tenants", {
  id: text("id").primaryKey(),
  slug: text("slug").notNull().unique(), // "alicks-standard" -> alicks-standard.barbero.co.zm
  name: text("name").notNull(),
  status: text("status").notNull().default("active"), // active | suspended | cancelled
  plan: text("plan").notNull().default("free"),      // free | pro | business
  ownerUserId: text("owner_user_id"),
  brandingJson: text("branding_json").notNull().default("{}"),
  // Per-tenant onboarding & billing state
  onboardingStep: text("onboarding_step").notNull().default("created"),
  stripeCustomerId: text("stripe_customer_id"),
  stripeSubscriptionId: text("stripe_subscription_id"),
  planRenewsAt: integer("plan_renews_at", { mode: "timestamp_ms" }),
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .notNull()
    .default(sql`(unixepoch() * 1000)`),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" })
    .notNull()
    .default(sql`(unixepoch() * 1000)`),
});

// Staff users — owners, managers, barbers, receptionists
// (multi-staff per tenant; replaces the old single `admin_users` table over time)
export const users = sqliteTable(
  "users",
  {
    id: text("id").primaryKey(),
    tenantId: text("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
    email: text("email").notNull(),
    passwordHash: text("password_hash"), // null when using magic-link only
    name: text("name").notNull(),
    role: text("role").notNull().default("manager"), // owner | manager | barber | receptionist
    image: text("image"),
    emailVerifiedAt: integer("email_verified_at", { mode: "timestamp_ms" }),
    lastLoginAt: integer("last_login_at", { mode: "timestamp_ms" }),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
  },
  (t) => ({
    emailIdx: uniqueIndex("users_email_idx").on(t.email),
    tenantIdx: index("users_tenant_idx").on(t.tenantId),
  }),
);

// Magic-link / email-verification tokens (single-use)
export const verificationTokens = sqliteTable("verification_tokens", {
  identifier: text("identifier").notNull(),  // email
  token: text("token").notNull().unique(),
  expires: integer("expires", { mode: "timestamp_ms" }).notNull(),
});

// Invitations — owner invites a barber/manager by email
export const invitations = sqliteTable(
  "invitations",
  {
    id: text("id").primaryKey(),
    tenantId: text("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
    email: text("email").notNull(),
    role: text("role").notNull().default("barber"),
    token: text("token").notNull().unique(),
    invitedBy: text("invited_by").notNull(),  // userId of inviter
    expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
    acceptedAt: integer("accepted_at", { mode: "timestamp_ms" }),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
  },
  (t) => ({
    tenantIdx: index("invitations_tenant_idx").on(t.tenantId),
  }),
);

// Auth.js (NextAuth) session/account tables — Drizzle adapter requires these names.
// We use the JWT strategy for sessions so the `sessions` table is for legacy compat;
// the `accounts` table stores OAuth provider links (for future Google sign-in).
export const sessions = sqliteTable("sessions", {
  sessionToken: text("session_token").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  expires: integer("expires", { mode: "timestamp_ms" }).notNull(),
});

export const accounts = sqliteTable("accounts", {
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  type: text("type").notNull(),
  provider: text("provider").notNull(),
  providerAccountId: text("provider_account_id").notNull(),
  refreshToken: text("refresh_token"),
  accessToken: text("access_token"),
  expiresAt: integer("expires_at", { mode: "timestamp_ms" }),
  tokenType: text("token_type"),
  scope: text("scope"),
  idToken: text("id_token"),
  sessionState: text("session_state"),
});

// Custom domains for Pro tenants — verified via DNS TXT record
export const customDomains = sqliteTable(
  "custom_domains",
  {
    id: text("id").primaryKey(),
    tenantId: text("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
    domain: text("domain").notNull().unique(),
    verificationToken: text("verification_token").notNull(),
    verifiedAt: integer("verified_at", { mode: "timestamp_ms" }),
    isPrimary: integer("is_primary", { mode: "boolean" }).notNull().default(false),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
  },
  (t) => ({
    tenantIdx: index("custom_domains_tenant_idx").on(t.tenantId),
  }),
);

// Audit log — every privileged action goes here
export const auditLog = sqliteTable(
  "audit_log",
  {
    id: text("id").primaryKey(),
    tenantId: text("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
    actorUserId: text("actor_user_id"),
    action: text("action").notNull(),              // e.g. "appointment.confirmed"
    targetType: text("target_type"),                // e.g. "appointment"
    targetId: text("target_id"),
    metadataJson: text("metadata_json"),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
  },
  (t) => ({
    tenantIdx: index("audit_log_tenant_idx").on(t.tenantId),
  }),
);

// ─────────────────────────────────────────────────────────────────
// Type exports
// ─────────────────────────────────────────────────────────────────
export type AdminUser = typeof adminUsers.$inferSelect;
export type Customer = typeof customers.$inferSelect;
export type NewCustomer = typeof customers.$inferInsert;
export type Service = typeof services.$inferSelect;
export type NewService = typeof services.$inferInsert;
export type AvailabilityRule = typeof availabilityRules.$inferSelect;
export type AvailabilityBlock = typeof availabilityBlocks.$inferSelect;
export type Appointment = typeof appointments.$inferSelect;
export type NewAppointment = typeof appointments.$inferInsert;
export type BusinessSettings = typeof businessSettings.$inferSelect;
export type Expense = typeof expenses.$inferSelect;
export type NewExpense = typeof expenses.$inferInsert;

// Barbero SaaS types
export type Tenant = typeof tenants.$inferSelect;
export type NewTenant = typeof tenants.$inferInsert;
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Invitation = typeof invitations.$inferSelect;
export type CustomDomain = typeof customDomains.$inferSelect;
export type AuditLog = typeof auditLog.$inferSelect;