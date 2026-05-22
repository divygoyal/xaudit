/**
 * Single source of truth for the locale catalogue.
 *
 * URL scheme uses hyphenated codes (`ja-jp`, `pt-br`, …) rather than
 * plain language codes (`ja`, `pt`). Reason: X usernames can be 1-15
 * alphanumeric chars, so handles like "ja", "ar", "es" exist in the
 * wild and would collide with /[username]/[shortid] verdict routes if
 * we used the short form. Hyphens are not valid in X usernames, so the
 * 5-char hyphenated form is conflict-free.
 *
 * `enabled` toggles whether next-intl considers the locale routable.
 * Adding a locale = drop a messages/{code}.json + flip enabled to true.
 */
export const LOCALES = {
  en: {
    name: "English",
    nativeName: "English",
    enabled: true,
    dir: "ltr",
    /** hreflang values emitted into <head>. The first one matches the URL
     *  exactly; the language-only alias gives broader Google matching. */
    hreflang: ["en"],
  },
  "ja-jp": {
    name: "Japanese",
    nativeName: "日本語",
    enabled: true,
    dir: "ltr",
    hreflang: ["ja-JP", "ja"],
  },
  "pt-br": {
    name: "Portuguese (Brazil)",
    nativeName: "Português (Brasil)",
    enabled: false,
    dir: "ltr",
    hreflang: ["pt-BR"],
  },
  "es-mx": {
    name: "Spanish (Mexico)",
    nativeName: "Español",
    enabled: false,
    dir: "ltr",
    hreflang: ["es-MX", "es"],
  },
  "ar-sa": {
    name: "Arabic (Saudi Arabia)",
    nativeName: "العربية",
    enabled: false,
    dir: "rtl",
    hreflang: ["ar-SA", "ar"],
  },
  "id-id": {
    name: "Indonesian",
    nativeName: "Bahasa Indonesia",
    enabled: false,
    dir: "ltr",
    hreflang: ["id-ID", "id"],
  },
} as const;

export type LocaleCode = keyof typeof LOCALES;

export const DEFAULT_LOCALE: LocaleCode = "en";

/** Array of locale codes that are currently routable. Drives next-intl's
 *  routing config + the hreflang link emitter. Disabled locales remain
 *  in the catalogue so we can wire/translate them without touching code. */
export const ENABLED_LOCALES = (
  Object.entries(LOCALES) as Array<[LocaleCode, (typeof LOCALES)[LocaleCode]]>
)
  .filter(([, meta]) => meta.enabled)
  .map(([code]) => code);

export function isEnabledLocale(value: string): value is LocaleCode {
  return (ENABLED_LOCALES as readonly string[]).includes(value);
}
