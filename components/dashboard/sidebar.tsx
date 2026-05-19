"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  History as HistoryIcon,
  Gift,
  CreditCard,
  Settings as SettingsIcon,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

type Item = { href: string; label: string; Icon: LucideIcon };

const ITEMS: Item[] = [
  { href: "/dashboard", label: "Overview", Icon: LayoutDashboard },
  { href: "/dashboard/history", label: "History", Icon: HistoryIcon },
  { href: "/dashboard/referrals", label: "Referrals", Icon: Gift },
  { href: "/dashboard/billing", label: "Billing", Icon: CreditCard },
  { href: "/dashboard/settings", label: "Settings", Icon: SettingsIcon },
];

export function DashboardSidebar() {
  const pathname = usePathname() ?? "";
  return (
    <aside className="md:sticky md:top-24 md:self-start">
      <div className="mb-3 px-2 font-mono text-[10px] uppercase tracking-[0.18em] text-ink-500">
        Workspace
      </div>
      <nav className="flex gap-1 overflow-x-auto md:flex-col md:overflow-visible">
        {ITEMS.map(({ href, label, Icon }) => {
          const active =
            href === "/dashboard"
              ? pathname === "/dashboard"
              : pathname === href || pathname.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              className={[
                "group inline-flex items-center gap-2.5 whitespace-nowrap rounded-[10px] border px-3 py-2 text-sm transition-all",
                active
                  ? "border-vermillion/40 bg-vermillion/[0.08] text-paper"
                  : "border-transparent text-ink-300 hover:border-ink-700 hover:bg-ink-900/60 hover:text-paper",
              ].join(" ")}
            >
              <Icon
                size={14}
                strokeWidth={active ? 2.4 : 2}
                className={active ? "text-vermillion-glow" : "text-ink-400 group-hover:text-paper"}
              />
              {label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
