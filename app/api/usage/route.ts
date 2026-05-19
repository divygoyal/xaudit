import { NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase-server";
import { getUsage } from "@/lib/usage";

export const runtime = "nodejs";

export async function GET() {
  const sb = getSupabaseServer();
  const {
    data: { user },
  } = await sb.auth.getUser();
  const usage = await getUsage(user?.id ?? null);
  return NextResponse.json({
    usage,
    user: user
      ? { id: user.id, email: user.email ?? null }
      : null,
  });
}
