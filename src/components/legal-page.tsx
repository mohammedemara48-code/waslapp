import { Link } from "@tanstack/react-router";
import { BrandMark } from "@/components/brand-mark";
import type { ReactNode } from "react";

export function LegalPage({ title, children }: { title: string; children: ReactNode }) {
  return (
    <main className="min-h-dvh bg-bg text-fg">
      <header className="mx-auto flex w-full max-w-3xl items-center justify-between px-6 py-6">
        <Link to="/" className="text-fg">
          <BrandMark />
        </Link>
        <Link to="/login" className="text-sm text-accent hover:underline">
          دخول
        </Link>
      </header>
      <article className="mx-auto w-full max-w-3xl space-y-5 px-6 pb-20">
        <h1 className="font-display text-3xl md:text-4xl">{title}</h1>
        <div className="space-y-4 text-sm leading-relaxed text-muted">{children}</div>
        <nav className="flex flex-wrap gap-4 border-t border-border pt-6 text-xs">
          <Link to="/about" className="text-accent hover:underline">
            عن وصل
          </Link>
          <Link to="/privacy" className="text-accent hover:underline">
            سياسة الخصوصية
          </Link>
          <Link to="/terms" className="text-accent hover:underline">
            شروط الاستخدام
          </Link>
        </nav>
      </article>
    </main>
  );
}
