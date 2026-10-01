import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { login, setSessionCookie } from "@/lib/auth";

const Body = z.object({
  username: z.string().min(1).max(50),
  password: z.string().min(1).max(200),
});

export async function POST(req: NextRequest) {
  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }
  const parsed = Body.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 },
    );
  }
  const result = await login(parsed.data.username, parsed.data.password);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 401 });
  }
  await setSessionCookie(result.token);
  return NextResponse.json({ ok: true });
}