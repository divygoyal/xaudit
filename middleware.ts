import { updateSession } from "@/lib/supabase-middleware";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  // OAuth defensive fallback. Supabase's redirect-validation falls
  // back to Site URL when the requested `redirectTo` isn't in the
  // allowed list — that puts the auth `?code=` at the root path of
  // our site instead of /auth/callback, and our handler never runs.
  // Forward it ourselves so sign-in works regardless of dashboard
  // misconfiguration. Drops only when pathname is exactly "/" so we
  // don't intercept legitimate ?code= params on other routes.
  const { pathname, searchParams } = request.nextUrl;
  if (pathname === "/" && searchParams.has("code")) {
    const url = request.nextUrl.clone();
    url.pathname = "/auth/callback";
    return NextResponse.redirect(url);
  }

  return await updateSession(request);
}

export const config = {
  matcher: [
    // Skip static assets, image optimization, and common static file types.
    "/((?!_next/static|_next/image|favicon.ico|fonts/|videos/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|otf|ttf|woff2?)$).*)",
  ],
};
