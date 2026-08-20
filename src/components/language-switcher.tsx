import { Languages } from "lucide-react";
import { LOCALES, useI18n, type Locale } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function LanguageSwitcher() {
  const { locale, t, setLocale } = useI18n();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label={t.language} className="relative">
          <Languages className="size-4" />
          <span className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 text-[9px] font-medium uppercase text-accent">
            {locale}
          </span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="min-w-40">
        <p className="px-2.5 py-1.5 text-xs text-muted">{t.language}</p>
        {LOCALES.map((item) => (
          <DropdownMenuItem
            key={item.id}
            onSelect={() => setLocale(item.id as Locale)}
            className={locale === item.id ? "bg-elevated text-accent" : undefined}
          >
            {item.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
