import Link from "next/link";
import { Globe } from "lucide-react";
import { getLocale } from "next-intl/server";
import {
  DEFAULT_LOCALE,
  ENABLED_LOCALES,
  LOCALES,
  type LocaleCode,
} from "@/i18n/config";

/** Tiny locale toggle for the navbar. Server component — reads the
 *  current locale via next-intl and renders a link to every OTHER
 *  enabled locale's homepage.
 *
 *  Always links to homepage (not pathname mapping) because not every
 *  page has a translation in every locale yet — e.g. /privacy only
 *  exists in English, so we don't want to bounce JP users to a 404 at
 *  /ja-jp/privacy. Once a locale gains full coverage we can upgrade
 *  this to a path-preserving switcher.
 *
 *  Hidden entirely when only one locale is enabled (Phase 0 state). */
export async function LanguageSwitcher() {
  const currentLocale = await getLocale();
  if (ENABLED_LOCALES.length < 2) return null;

  const others = ENABLED_LOCALES.filter((l) => l !== currentLocale);

  return (
    <div className="hidden items-center gap-1 md:flex">
      <span
        aria-hidden
        className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-ink-700 bg-ink-900/70 text-ink-300"
      >
        <Globe size={12} strokeWidth={2.2} />
      </span>
      {others.map((code) => {
        const meta = LOCALES[code as LocaleCode];
        const href = code === DEFAULT_LOCALE ? "/" : `/${code}`;
        return (
          <Link
            key={code}
            href={href}
            className="inline-flex items-center rounded-full border border-ink-700 bg-ink-900/70 px-3 py-1.5 text-[12px] text-paper backdrop-blur transition-all hover:border-vermillion hover:bg-ink-800"
            aria-label={`Switch language to ${meta.name}`}
          >
            {meta.nativeName}
          </Link>
        );
      })}
    </div>
  );
}
