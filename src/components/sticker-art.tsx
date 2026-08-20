import type { ReactElement, ReactNode } from "react";
import type { StickerId } from "@/lib/stickers";
import { cn } from "@/lib/utils";

function Shell({ className, children, fill }: { className?: string; children: ReactNode; fill: string }) {
  return (
    <svg viewBox="0 0 64 64" className={cn("size-12 drop-shadow-sm", className)} aria-hidden>
      <circle cx="32" cy="32" r="29" className={fill} />
      <circle cx="32" cy="32" r="29" fill="none" className="stroke-bg" strokeWidth="3" />
      {children}
    </svg>
  );
}

export function StickerArt({ id, className }: { id: string; className?: string }) {
  const art: Record<StickerId, ReactNode> = {
    peace: (
      <Shell className={className} fill="fill-ok">
        <circle cx="32" cy="32" r="14" className="fill-bg" />
        <path d="M32 18v28M32 32l10 10M32 32l-10 10" className="stroke-ok" strokeWidth="3" fill="none" />
      </Shell>
    ),
    bloom: (
      <Shell className={className} fill="fill-danger">
        <circle cx="32" cy="24" r="7" className="fill-bg" />
        <circle cx="22" cy="32" r="7" className="fill-bg" />
        <circle cx="42" cy="32" r="7" className="fill-bg" />
        <circle cx="26" cy="42" r="7" className="fill-bg" />
        <circle cx="38" cy="42" r="7" className="fill-bg" />
        <circle cx="32" cy="33" r="5" className="fill-accent" />
      </Shell>
    ),
    coffee: (
      <Shell className={className} fill="fill-accent">
        <path d="M22 28h18v12a8 8 0 0 1-16 0z" className="fill-bg" />
        <path d="M40 30h5a5 5 0 0 1 0 10h-5" className="stroke-bg" strokeWidth="3" fill="none" />
        <path d="M26 22c2 2 2 4 0 6M32 21c2 2 2 4 0 6" className="stroke-bg" strokeWidth="2" fill="none" />
      </Shell>
    ),
    crown: (
      <Shell className={className} fill="fill-accent">
        <path d="M16 42h32L42 26l-10 8-10-8z" className="fill-bg" />
        <circle cx="16" cy="24" r="3" className="fill-bg" />
        <circle cx="32" cy="18" r="3" className="fill-bg" />
        <circle cx="48" cy="24" r="3" className="fill-bg" />
      </Shell>
    ),
    star: (
      <Shell className={className} fill="fill-accent">
        <path d="M32 14l5 12h13l-10 8 4 12-12-8-12 8 4-12-10-8h13z" className="fill-bg" />
      </Shell>
    ),
    light: (
      <Shell className={className} fill="fill-accent">
        <circle cx="32" cy="30" r="10" className="fill-bg" />
        <path d="M32 14v4M32 42v4M18 30h4M42 30h4M22 20l3 3M39 40l3 3M42 20l-3 3M22 40l-3 3" className="stroke-bg" strokeWidth="3" />
      </Shell>
    ),
    key: (
      <Shell className={className} fill="fill-ok">
        <circle cx="26" cy="28" r="8" className="fill-bg" />
        <circle cx="26" cy="28" r="3" className="fill-ok" />
        <path d="M32 30h16v4h-4v4h-4v-4h-4" className="fill-bg" />
      </Shell>
    ),
    gift: (
      <Shell className={className} fill="fill-danger">
        <rect x="18" y="28" width="28" height="18" rx="3" className="fill-bg" />
        <rect x="18" y="22" width="28" height="8" rx="2" className="fill-bg" />
        <rect x="30" y="22" width="4" height="24" className="fill-danger" />
        <path d="M32 22c-6-8-12-2-8 4M32 22c6-8 12-2 8 4" className="stroke-bg" strokeWidth="2.5" fill="none" />
      </Shell>
    ),
    heart: (
      <Shell className={className} fill="fill-danger">
        <path d="M32 46s-16-10-16-20a8 8 0 0 1 16-4 8 8 0 0 1 16 4c0 10-16 20-16 20z" className="fill-bg" />
      </Shell>
    ),
    fire: (
      <Shell className={className} fill="fill-accent">
        <path d="M32 16s10 10 10 20a10 10 0 1 1-20 0c0-6 6-12 10-20z" className="fill-bg" />
        <path d="M32 34c2 4 6 6 6 10a6 6 0 1 1-12 0c0-3 3-5 6-10z" className="fill-danger" />
      </Shell>
    ),
    moon: (
      <Shell className={className} fill="fill-elevated">
        <path d="M36 16a16 16 0 1 0 8 28 14 14 0 1 1-8-28z" className="fill-accent" />
      </Shell>
    ),
    wave: (
      <Shell className={className} fill="fill-ok">
        <path d="M18 36c6-10 10-10 14 0s8 10 14 0" className="stroke-bg" strokeWidth="4" fill="none" />
        <path d="M18 26c6-8 10-8 14 0s8 8 14 0" className="stroke-bg" strokeWidth="3" fill="none" opacity="0.6" />
      </Shell>
    ),
  };
  return (art[id as StickerId] ?? art.gift) as ReactElement;
}
