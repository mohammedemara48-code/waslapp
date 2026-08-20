import { cn } from "@/lib/utils";

export function BrandMark({ className, size = "md" }: { className?: string; size?: "sm" | "md" | "lg" }) {
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <svg
        viewBox="0 0 32 32"
        className={cn(
          "shrink-0 text-accent",
          size === "sm" && "size-8",
          size === "md" && "size-9",
          size === "lg" && "size-12",
        )}
        aria-hidden
      >
        <rect width="32" height="32" rx="10" fill="currentColor" fillOpacity="0.12" />
        <circle cx="10" cy="16" r="5" fill="none" stroke="currentColor" strokeWidth="2" />
        <circle cx="22" cy="16" r="5" fill="none" stroke="currentColor" strokeWidth="2" />
        <path d="M14 16h4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
      <span
        className={cn(
          "font-display leading-none text-fg",
          size === "sm" && "text-xl",
          size === "md" && "text-2xl",
          size === "lg" && "text-4xl",
        )}
      >
        وصل
      </span>
    </div>
  );
}