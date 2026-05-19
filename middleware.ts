import { updateSession } from "@/lib/supabase-middleware";
import type { NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    // Skip static assets, image optimization, and common static file types.
    "/((?!_next/static|_next/image|favicon.ico|fonts/|videos/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|otf|ttf|woff2?)$).*)",
  ],
};
