import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import { db, schema } from "@/lib/db";
import { eq } from "drizzle-orm";

const COOKIE_NAME = "tas_admin_session";
const ALG = "HS256";

function getSecret(): Uint8Array {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error(
      "AUTH_SECRET must be set in .env.local to a 32-byte hex string.",
    );
  }
  return new TextEncoder().encode(secret);
}

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 10);
}

export async function verifyPassword(
  plain: string,
  hash: string,
): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

export async function createSessionToken(adminId: string): Promise<string> {
  return await new SignJWT({ adminId })
    .setProtectedHeader({ alg: ALG })
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(getSecret());
}

export async function setSessionCookie(token: string) {
  cookies().set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
}

export function clearSessionCookie() {
  cookies().set(COOKIE_NAME, "", {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}

export async function readSessionFromCookie(): Promise<{
  adminId: string;
} | null> {
  const token = cookies().get(COOKIE_NAME)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, getSecret(), {
      algorithms: [ALG],
    });
    if (typeof payload.adminId !== "string") return null;
    return { adminId: payload.adminId };
  } catch {
    return null;
  }
}

export async function getCurrentAdmin(): Promise<{
  id: string;
  username: string;
  displayName: string;
} | null> {
  const session = await readSessionFromCookie();
  if (!session) return null;
  const row = await db
    .select()
    .from(schema.adminUsers)
    .where(eq(schema.adminUsers.id, session.adminId))
    .limit(1);
  const u = row[0];
  if (!u) return null;
  return { id: u.id, username: u.username, displayName: u.displayName };
}

export async function login(
  username: string,
  password: string,
): Promise<{ ok: true; token: string } | { ok: false; error: string }> {
  const row = await db
    .select()
    .from(schema.adminUsers)
    .where(eq(schema.adminUsers.username, username))
    .limit(1);
  const u = row[0];
  if (!u) return { ok: false, error: "Invalid username or password." };
  const ok = await verifyPassword(password, u.passwordHash);
  if (!ok) return { ok: false, error: "Invalid username or password." };
  const token = await createSessionToken(u.id);
  return { ok: true, token };
}

export const SESSION_COOKIE_NAME = COOKIE_NAME;