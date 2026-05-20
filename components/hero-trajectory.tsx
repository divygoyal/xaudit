// Animated dotted trajectory that runs behind the hero — start bottom-left,
// zigzag upward, end at a rocket in the top-right. The path stretches with
// the container; the dots and rocket are positioned with percentages so they
// stay perfectly round and unscaled.
//
// All motion is CSS-only and respects prefers-reduced-motion.

const PATH_POINTS = [
  { x: 30, y: 555 },
  { x: 175, y: 470 },
  { x: 250, y: 515 },
  { x: 470, y: 380 },
  { x: 555, y: 425 },
  { x: 745, y: 250 },
  { x: 830, y: 295 },
  { x: 1090, y: 90 },
];

const VIEWBOX_W = 1200;
const VIEWBOX_H = 600;

const PATH_D = PATH_POINTS.reduce(
  (d, p, i) => `${d} ${i === 0 ? "M" : "L"} ${p.x} ${p.y}`,
  ""
).trim();

const CHECKPOINTS = PATH_POINTS.slice(1, -1);
const ROCKET = PATH_POINTS[PATH_POINTS.length - 1];

export function HeroTrajectory() {
  return (
    <div
      className="pointer-events-none absolute inset-0 hidden overflow-hidden md:block"
      aria-hidden="true"
    >
      <svg
        viewBox={`0 0 ${VIEWBOX_W} ${VIEWBOX_H}`}
        preserveAspectRatio="none"
        className="absolute inset-0 h-full w-full"
      >
        <path
          d={PATH_D}
          stroke="rgb(var(--vermillion))"
          strokeWidth="1.4"
          strokeOpacity="0.55"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
          strokeDasharray="2.5 7"
          vectorEffect="non-scaling-stroke"
          className="hero-traj-path"
        />
      </svg>

      {CHECKPOINTS.map((p, i) => (
        <span
          key={i}
          className="hero-traj-dot absolute block"
          style={
            {
              left: `${(p.x / VIEWBOX_W) * 100}%`,
              top: `${(p.y / VIEWBOX_H) * 100}%`,
              "--enter-delay": `${0.55 + i * 0.18}s`,
            } as React.CSSProperties
          }
        >
          <span className="hero-traj-dot-core" />
        </span>
      ))}

      {/* Micro-particles travelling along the trajectory toward the rocket.
          A small stream of vermillion sparks suggests "growth flowing
          upward" — animated entirely in CSS via keyframes that step
          through the checkpoint positions as percentages. */}
      {[0, 1.6, 3.2, 4.8].map((delaySec, i) => (
        <span
          key={`particle-${i}`}
          className="hero-traj-particle absolute"
          style={{ animationDelay: `${4 + delaySec}s` }}
          aria-hidden="true"
        />
      ))}

      <span
        className="hero-traj-rocket absolute"
        style={{
          left: `${(ROCKET.x / VIEWBOX_W) * 100}%`,
          top: `${(ROCKET.y / VIEWBOX_H) * 100}%`,
        }}
      >
        <RocketGlyph />
      </span>
    </div>
  );
}

function RocketGlyph() {
  return (
    <svg
      width="34"
      height="34"
      viewBox="-18 -18 36 36"
      fill="none"
      aria-hidden="true"
    >
      {/* fins */}
      <path
        d="M -8 1 L -13 8 L -8 6 Z M 8 1 L 13 8 L 8 6 Z"
        fill="rgb(var(--vermillion))"
        fillOpacity="0.95"
        stroke="rgb(var(--vermillion))"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
      {/* body */}
      <path
        d="M -7 -3 C -7 -10 -3 -15 0 -16 C 3 -15 7 -10 7 -3 L 7 6 L -7 6 Z"
        fill="rgb(var(--ink-950))"
        stroke="rgb(var(--vermillion))"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      {/* porthole */}
      <circle cx="0" cy="-6" r="2.1" fill="rgb(var(--vermillion))" />
      {/* flame */}
      <path
        d="M -3.5 6 L -1.5 11 L 0 7.5 L 1.5 11 L 3.5 6 Z"
        fill="rgb(var(--vermillion))"
        stroke="rgb(var(--vermillion))"
        strokeWidth="1"
        strokeLinejoin="round"
        className="hero-traj-flame"
      />
    </svg>
  );
}
