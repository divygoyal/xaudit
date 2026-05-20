import type { Config } from "tailwindcss";

const rgb = (v: string) => `rgb(var(${v}) / <alpha-value>)`;

const config: Config = {
  darkMode: "class",
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      // All colors resolve via CSS variables defined in globals.css.
      // The semantic stays the same in both themes:
      //   ink-950 = page bg
      //   paper   = highest-contrast foreground
      //   ink-200/300 = body / soft text
      colors: {
        ink: {
          950: rgb("--ink-950"),
          900: rgb("--ink-900"),
          800: rgb("--ink-800"),
          700: rgb("--ink-700"),
          600: rgb("--ink-600"),
          500: rgb("--ink-500"),
          400: rgb("--ink-400"),
          300: rgb("--ink-300"),
          200: rgb("--ink-200"),
          100: rgb("--ink-100"),
        },
        paper: {
          DEFAULT: rgb("--paper"),
          dim: rgb("--paper-dim"),
          warm: rgb("--paper-warm"),
        },
        vermillion: {
          DEFAULT: rgb("--vermillion"),
          soft: rgb("--vermillion-soft"),
          deep: rgb("--vermillion-deep"),
          glow: rgb("--vermillion-glow"),
        },
        moss: {
          DEFAULT: rgb("--moss"),
          dim: rgb("--moss-dim"),
          glow: rgb("--moss-glow"),
        },
        rust: {
          DEFAULT: rgb("--rust"),
          dim: rgb("--rust-dim"),
          glow: rgb("--rust-glow"),
        },
      },
      fontFamily: {
        sans: ["var(--font-sans-display)", "ui-sans-serif", "system-ui"],
        serif: ["var(--font-instrument-serif)", "ui-serif", "Georgia"],
        mono: ["var(--font-mono-display)", "ui-monospace", "monospace"],
        handwritten: ["var(--font-handwritten)", "Caveat", "cursive"],
      },
      fontSize: {
        "display-xl": ["clamp(3.5rem, 8.5vw, 7.5rem)", { lineHeight: "0.95", letterSpacing: "-0.04em" }],
        "display-lg": ["clamp(2.75rem, 6vw, 5rem)", { lineHeight: "1.02", letterSpacing: "-0.035em" }],
        "display-md": ["clamp(2rem, 4vw, 3.25rem)", { lineHeight: "1.05", letterSpacing: "-0.03em" }],
      },
      animation: {
        "fade-up": "fadeUp 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards",
        "draw-underline": "drawUnderline 1.2s cubic-bezier(0.65, 0, 0.35, 1) 0.6s forwards",
        "pulse-soft": "pulseSoft 3s ease-in-out infinite",
        "shimmer": "shimmer 2.4s linear infinite",
        "ticker": "ticker 28s linear infinite",
      },
      keyframes: {
        fadeUp: {
          "0%": { opacity: "0", transform: "translateY(20px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        drawUnderline: {
          "0%": { strokeDashoffset: "400" },
          "100%": { strokeDashoffset: "0" },
        },
        pulseSoft: {
          "0%, 100%": { opacity: "0.6" },
          "50%": { opacity: "1" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        ticker: {
          "0%": { transform: "translateX(0)" },
          "100%": { transform: "translateX(-50%)" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
