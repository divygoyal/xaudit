import type { Metadata } from "next";

// Sandbox-friendly wrapper for upstream stream players. The parent
// /live overlay loads THIS page inside a sandboxed iframe; this page
// then renders the actual upstream player (embed.st / dami-tv.pro) in
// a nested iframe. The upstream player can't detect the outer sandbox
// from inside the wrapper, so it loads normally — but popunder ads
// and parent-navigation tricks are still blocked by the outer sandbox.
//
// Strict allowlist on `src` so an attacker can't get us to embed an
// arbitrary URL via a crafted /embed/player link.

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

const SRC_ALLOWLIST = [
  /^https:\/\/embed\.st\//,
  /^https:\/\/(?:www\.)?embedstreams\.top\//,
  /^https:\/\/dami-tv\.pro\//,
];

type SearchParams = { src?: string; title?: string };

export default function PlayerWrapperPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const src = (searchParams.src ?? "").trim();
  const title = (searchParams.title ?? "Live").slice(0, 200);
  const allowed = SRC_ALLOWLIST.some((re) => re.test(src));

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "#000",
        zIndex: 1,
      }}
    >
      {allowed ? (
        <iframe
          src={src}
          title={title}
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            border: 0,
            background: "#000",
          }}
          // Permission policy for video features; this is independent of
          // the OUTER iframe's sandbox attribute.
          allow="autoplay; fullscreen; picture-in-picture; encrypted-media"
          allowFullScreen
          referrerPolicy="no-referrer"
        />
      ) : (
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#888",
            fontFamily: "system-ui, sans-serif",
            fontSize: 14,
          }}
        >
          Stream source is not on the allowlist.
        </div>
      )}
    </div>
  );
}
