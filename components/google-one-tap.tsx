"use client";

import Script from "next/script";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseClient } from "@/lib/supabase-client";

// Google Identity Services types — only the bits we touch.
declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string;
            callback: (response: { credential: string }) => void;
            auto_select?: boolean;
            cancel_on_tap_outside?: boolean;
            nonce?: string;
            use_fedcm_for_prompt?: boolean;
          }) => void;
          prompt: (
            momentListener?: (notification: {
              isDismissedMoment?: () => boolean;
              isSkippedMoment?: () => boolean;
              isNotDisplayed?: () => boolean;
              getDismissedReason?: () => string;
              getNotDisplayedReason?: () => string;
            }) => void
          ) => void;
          cancel: () => void;
        };
      };
    };
  }
}

// v2 key — invalidates any stale flag set by the previous overly-aggressive
// dismissal logic.
const DISMISS_KEY = "xaudit_onetap_dismissed_at_v2";

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function generateNonce(): string {
  const arr = new Uint8Array(32);
  crypto.getRandomValues(arr);
  return bytesToHex(arr);
}

async function sha256Hex(text: string): Promise<string> {
  const data = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return bytesToHex(new Uint8Array(digest));
}
const DISMISS_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

/**
 * Google One Tap. Renders nothing if the user is already signed in or
 * has dismissed the prompt in the last 7 days. Mount this once near the
 * top of the home page; it manages its own visibility.
 */
export function GoogleOneTap({ signedIn }: { signedIn: boolean }) {
  const router = useRouter();

  useEffect(() => {
    if (signedIn) return;

    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    if (!clientId) return;

    if (typeof window === "undefined") return;
    const dismissedAt = Number(window.localStorage.getItem(DISMISS_KEY) ?? 0);
    if (dismissedAt && Date.now() - dismissedAt < DISMISS_TTL_MS) return;

    let cancelled = false;
    const init = async () => {
      if (cancelled || !window.google) return;

      // Nonce handshake: we generate a random value, hash it with SHA-256,
      // pass the HASH to Google (embedded in the ID token), and the RAW
      // value to Supabase so it can verify SHA-256(raw) == hashed.
      // Required by Supabase or the token is rejected.
      const rawNonce = generateNonce();
      const hashedNonce = await sha256Hex(rawNonce);
      if (cancelled) return;

      window.google.accounts.id.initialize({
        client_id: clientId,
        nonce: hashedNonce,
        callback: async (response) => {
          const supabase = getSupabaseClient();
          const { error } = await supabase.auth.signInWithIdToken({
            provider: "google",
            token: response.credential,
            nonce: rawNonce,
          });
          if (error) {
            console.warn("[one-tap] signInWithIdToken failed:", error.message);
            return;
          }
          router.refresh();
        },
        auto_select: false,
        cancel_on_tap_outside: false,
      });
      window.google.accounts.id.prompt((notification) => {
        // ONLY persist the 7-day cooldown when the USER actively dismissed
        // (clicked the X). Google's internal "not displayed" / "skipped"
        // reasons (cooldown, FedCM transient errors, opt-out, etc.) should
        // NOT poison our local state — we want to retry on the next visit.
        if (notification.isDismissedMoment?.()) {
          const reason = notification.getDismissedReason?.();
          // Only treat explicit dismissals as a real "no thanks".
          if (reason === "credential_returned") return;
          window.localStorage.setItem(DISMISS_KEY, String(Date.now()));
          return;
        }
        if (notification.isNotDisplayed?.()) {
          console.warn(
            "[one-tap] not displayed:",
            notification.getNotDisplayedReason?.()
          );
        }
      });
    };

    // Poll briefly for the GSI script to finish loading.
    if (window.google) {
      init();
    } else {
      const start = Date.now();
      const iv = window.setInterval(() => {
        if (window.google) {
          window.clearInterval(iv);
          init();
        } else if (Date.now() - start > 6000) {
          window.clearInterval(iv);
        }
      }, 150);
      return () => {
        cancelled = true;
        window.clearInterval(iv);
      };
    }

    return () => {
      cancelled = true;
    };
  }, [signedIn, router]);

  if (signedIn) return null;
  return (
    <Script
      src="https://accounts.google.com/gsi/client"
      strategy="afterInteractive"
      async
      defer
    />
  );
}
