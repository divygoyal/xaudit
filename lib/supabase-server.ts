import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * Server-side Supabase client. Reads/writes the user's session via cookies.
 * Use in server components, server actions, and route handlers when you
 * need the CURRENT USER context (RLS applies). For admin/cron tasks that
 * must bypass RLS, use `getSupabaseAdmin()` from `lib/supabase-admin.ts`.
 */
export function getSupabaseServer() {
  const cookieStore = cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // setAll() throws when called from a Server Component (read-only context).
            // The middleware refresh handles session updates, so this is safe to swallow.
          }
        },
      },
    }
  );
}
