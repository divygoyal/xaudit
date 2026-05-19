export function HandwrittenUnderline({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 400 24"
      preserveAspectRatio="none"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      {/* primary marker stroke — punchy vermillion in both themes */}
      <path
        d="M4 14 C 60 6, 130 19, 200 11 S 340 18, 396 9"
        stroke="rgb(var(--vermillion-soft))"
        strokeWidth="5"
        strokeLinecap="round"
        className="underline-path animate-draw-underline"
      />
      {/* secondary lighter stroke for depth */}
      <path
        d="M8 17 C 80 12, 150 21, 220 16 S 330 21, 392 14"
        stroke="rgb(var(--vermillion-glow))"
        strokeOpacity="0.55"
        strokeWidth="2.5"
        strokeLinecap="round"
        className="underline-path animate-draw-underline"
        style={{ animationDelay: "0.85s" }}
      />
    </svg>
  );
}
