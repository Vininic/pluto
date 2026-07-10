import { cn } from "@/lib/utils";

/** The Pluto mark — a coin/medallion: an outer ring (the vault) and an inner
 *  ring (the coin face), with a hairline mint-mark top and bottom. Pluto,
 *  lord of the underworld's stored wealth, guards what it earns — a closed
 *  circle, not a spent one. */
export function PlutoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" fill="none" className={cn("h-6 w-6", className)} aria-hidden>
      <circle cx="32" cy="32" r="15" stroke="currentColor" strokeWidth="4" />
      <circle cx="32" cy="32" r="8.5" stroke="currentColor" strokeWidth="3" />
      <path d="M32 17.5 V13.5 M32 50.5 V46.5" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
    </svg>
  );
}

interface LogoProps {
  /** "light" for dark surfaces (sidebar, login panel); "dark" for parchment. */
  variant?: "light" | "dark";
  className?: string;
}

export default function Logo({ variant = "dark", className }: LogoProps) {
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <PlutoMark className={variant === "light" ? "text-secondary-soft" : "text-secondary"} />
      <span
        className={cn(
          "font-display text-xl leading-none",
          variant === "light" ? "text-sidebar-foreground" : "text-primary",
        )}
      >
        Pluto
      </span>
    </div>
  );
}
