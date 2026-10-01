import { drizzle } from "drizzle-orm/libsql";
import { createClient, type Client } from "@libsql/client";
import fs from "node:fs";
import path from "node:path";
import * as schema from "./schema";

/**
 * THE ALICK STANDARD — Database connection.
 *
 * Uses libsql (the @libsql/client) with a local SQLite file.
 * libsql ships prebuilt binaries for Windows + Node 24, so no
 * native compilation is required.
 */

const rawDbUrl = process.env.DATABASE_URL ?? "./data/tas.db";
// libsql requires URLs in the format file:./path or file:absolute or https://
const dbUrl = rawDbUrl.startsWith("file:") ||
  rawDbUrl.startsWith("https:") ||
  rawDbUrl.startsWith("libsql:")
    ? rawDbUrl
    : `file:${path.isAbsolute(rawDbUrl) ? rawDbUrl : path.join(process.cwd(), rawDbUrl)}`;

const isLocalFile = dbUrl.startsWith("file:");

// Ensure directory exists for local file
if (isLocalFile) {
  const filePath = dbUrl.slice("file:".length);
  const absPath = path.isAbsolute(filePath) ? filePath : path.join(process.cwd(), filePath);
  const dir = path.dirname(absPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

declare global {
  // eslint-disable-next-line no-var
  var __tasClient: Client | undefined;
  // eslint-disable-next-line no-var
  var __tasDb: ReturnType<typeof drizzle> | undefined;
}

const client =
  globalThis.__tasClient ??
  createClient({
    url: dbUrl,
  });

if (process.env.NODE_ENV !== "production") {
  globalThis.__tasClient = client;
}

export const sqliteConn = client;
export const db = globalThis.__tasDb ?? drizzle(client, { schema });
if (process.env.NODE_ENV !== "production") {
  globalThis.__tasDb = db;
}

export { schema };