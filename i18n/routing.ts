import { defineRouting } from "next-intl/routing";
import { DEFAULT_LOCALE, ENABLED_LOCALES } from "./config";

/**
 * next-intl routing config.
 *   - `localePrefix: 'as-needed'`  → default locale (`en`) has no URL
 *     prefix so https://letxcook.com/ stays English and all existing
 *     backlinks (shared verdict URLs, etc.) keep working unchanged.
 *     Other locales live at /ja-jp, /pt-br, etc.
 *   - `localeDetection: false`     → we do NOT auto-redirect users by
 *     Accept-Language. Google warns against forced geo redirects and
 *     users hate them. Detection still happens (for a future "view in
 *     日本語?" banner) but the middleware will not change the URL.
 */
export const routing = defineRouting({
  locales: ENABLED_LOCALES,
  defaultLocale: DEFAULT_LOCALE,
  localePrefix: "as-needed",
  localeDetection: false,
});
