import { setRequestLocale } from "next-intl/server";

/**
 * Static-folder locale layout. Calling setRequestLocale("ja-jp") tells
 * next-intl that every server component below this layout should pull
 * from messages/ja-jp.json — without it the request-config falls back
 * to the default locale and the page would silently render in English.
 *
 * We intentionally don't render <html lang="ja-JP"> here because the
 * single root layout (app/layout.tsx) already owns <html>. Setting lang
 * per locale requires splitting the app into route groups with multiple
 * root layouts — deferred until we ship the second non-default locale
 * (see Phase 0 commit notes for the rationale). For now Google relies
 * on the URL pattern (/ja-jp/) and hreflang head injection (next).
 */
export default function JaJpLayout({ children }: { children: React.ReactNode }) {
  setRequestLocale("ja-jp");
  return <>{children}</>;
}
