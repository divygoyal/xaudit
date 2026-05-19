import { NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase-server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export const runtime = "nodejs";

/**
 * Permanently delete the signed-in user's account.
 *
 * 1. Auth the request via the user's session cookie (so anonymous clients
 *    can't hit this).
 * 2. Use the service-role client to delete the auth.users row — Supabase
 *    will cascade through anything with ON DELETE CASCADE (analyses,
 *    user_credits, referrals on either side, analytics_events).
 * 3. Sign the user out client-side after the response lands.
 */
export async function POST() {
  const sb = getSupabaseServer();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const admin = getSupabaseAdmin();
  const { error } = await admin.auth.admin.deleteUser(user.id);
  if (error) {
    console.error("[account/delete] supabase delete error:", error);
    return NextResponse.json({ error: "Couldn't delete account." }, { status: 500 });
  }

  // Sign out the session cookie on the way back.
  await sb.auth.signOut();
  return NextResponse.json({ ok: true });
}
