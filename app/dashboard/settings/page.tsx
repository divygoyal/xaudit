import { Mail, ShieldCheck } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { getSupabaseServer } from "@/lib/supabase-server";
import { SignOutButton } from "@/components/dashboard/sign-out";
import { DeleteAccountButton } from "@/components/dashboard/delete-account";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const sb = getSupabaseServer();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return null;

  const created = user.created_at
    ? new Date(user.created_at).toLocaleDateString(undefined, {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : null;
  const provider = user.app_metadata?.provider ?? "email";
  const providerLabel =
    provider === "google" ? "Google" : provider === "email" ? "Magic link" : provider;

  return (
    <div className="space-y-8">
      <header>
        <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-500">
          Settings
        </div>
        <h1 className="mt-1 font-serif text-3xl tracking-tight text-paper md:text-4xl">
          Your <span className="serif-italic text-vermillion">account</span>
        </h1>
        <p className="mt-1.5 text-sm text-ink-300">
          Manage how you sign in and what we keep on file.
        </p>
      </header>

      {/* Account card */}
      <section className="rounded-2xl border border-ink-800 bg-ink-900/40 p-6">
        <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-500">
          Account
        </div>
        <dl className="mt-4 grid gap-5 md:grid-cols-2">
          <Field
            label="Email"
            value={user.email ?? "—"}
            Icon={Mail}
          />
          <Field
            label="Signed in with"
            value={providerLabel}
            Icon={ShieldCheck}
          />
          {created && (
            <Field
              label="Member since"
              value={created}
              Icon={ShieldCheck}
            />
          )}
        </dl>
        <div className="mt-6">
          <SignOutButton />
        </div>
      </section>

      {/* Appearance hint */}
      <section className="rounded-2xl border border-ink-800 bg-ink-900/40 p-6">
        <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-500">
          Appearance
        </div>
        <p className="mt-2 text-[13px] text-ink-300">
          Toggle light / dark from the icon in the top-right of any page. We remember your
          preference for this browser.
        </p>
      </section>

      {/* Danger zone */}
      <section className="rounded-2xl border border-rust/30 bg-rust/[0.04] p-6">
        <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-rust">
          Danger zone
        </div>
        <h2 className="mt-2 font-serif text-xl text-paper">Delete your account</h2>
        <p className="mt-1 max-w-xl text-[13px] text-ink-300">
          Removes your audits, credits, and login. Can't be undone.
        </p>
        <div className="mt-4 max-w-xl">
          <DeleteAccountButton />
        </div>
      </section>
    </div>
  );
}

function Field({
  label,
  value,
  Icon,
}: {
  label: string;
  value: string;
  Icon: LucideIcon;
}) {
  return (
    <div>
      <dt className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.18em] text-ink-500">
        <Icon size={11} strokeWidth={2.4} />
        {label}
      </dt>
      <dd className="mt-1 text-[14px] text-paper">{value}</dd>
    </div>
  );
}
