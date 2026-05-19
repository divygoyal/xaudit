import { forwardRef } from "react";

type Variant = "primary" | "ghost" | "outline";

interface Props extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  asChild?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, Props>(function Button(
  { variant = "primary", className = "", children, ...rest },
  ref
) {
  const base =
    "group relative inline-flex items-center justify-center gap-2 rounded-full text-sm font-medium tracking-tight transition-all duration-200 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed";
  const sizes = "px-6 py-3.5";

  const styles: Record<Variant, string> = {
    primary:
      "bg-paper text-ink-950 hover:bg-paper-warm shadow-[0_1px_0_0_rgba(255,255,255,0.6)_inset,0_8px_24px_-8px_rgba(255,69,0,0.35)] hover:shadow-[0_1px_0_0_rgba(255,255,255,0.6)_inset,0_12px_32px_-8px_rgba(255,69,0,0.5)]",
    ghost: "text-paper hover:bg-ink-800/60",
    outline:
      "border border-ink-700 bg-ink-900/40 text-paper backdrop-blur hover:border-ink-500 hover:bg-ink-800/60",
  };

  return (
    <button ref={ref} className={`${base} ${sizes} ${styles[variant]} ${className}`} {...rest}>
      {children}
    </button>
  );
});
