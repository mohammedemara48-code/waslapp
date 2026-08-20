import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { listFriends, inviteToPlay } from "@/lib/social/server";
import { getMyPoints } from "@/lib/points/server";
import { RANK_POINTS, rankLabel } from "@/lib/points";
import { AppShell } from "@/components/app-shell";
import { NameBadge } from "@/components/name-badge";
import { SudokuGame } from "@/components/sudoku-game";
import { ChessGame } from "@/components/chess-game";
import { Button } from "@/components/ui/button";

const CHANNELS = [
  { name: "الجزيرة", href: "https://www.youtube.com/@aljazeera/live" },
  { name: "الجزيرة مباشر", href: "https://www.youtube.com/@aljazeeramubasher/live" },
  { name: "العربية", href: "https://www.youtube.com/@AlArabiya/live" },
  { name: "العربية حدث", href: "https://www.youtube.com/@AlArabiyaPrograms/live" },
  { name: "سكاي نيوز عربية", href: "https://www.youtube.com/@skynewsarabia/live" },
  { name: "فرانس 24 عربي", href: "https://www.youtube.com/@France24_ar/live" },
  { name: "DW عربية", href: "https://www.youtube.com/@deutschewellearabic/live" },
  { name: "BBC عربي", href: "https://www.youtube.com/@bbcarabic/live" },
  { name: "النيل للأخبار", href: "https://www.youtube.com/@NileNews/live" },
];

const RADIO = [
  { name: "إذاعة القرآن الكريم", src: "https://backup.qurango.net/radio/tarateel" },
  { name: "إذاعة مصر (البرنامج العام)", href: "https://www.radio.net/s/egyptgeneral" },
  { name: "مونت كارلو الدولية", href: "https://www.mc-doualiya.com/direct" },
  { name: "BBC World Service", src: "https://stream.live.vc.bbcmedia.co.uk/bbc_world_service" },
  { name: "راديو سوا", href: "https://www.radiosawa.com/" },
];

export function ToolsPage() {
  const friends = useQuery({ queryKey: ["friends"], queryFn: () => listFriends() });
  const stats = useQuery({ queryKey: ["my-points"], queryFn: () => getMyPoints() });
  const [tab, setTab] = useState<"games" | "tv" | "radio">("games");
  const points = stats.data?.points ?? 0;

  return (
    <AppShell active="tools">
      <div className="mx-auto w-full max-w-2xl space-y-8 px-5 py-8">
        <div>
          <p className="text-sm text-accent">استراحة بين المحادثات</p>
          <h1 className="mt-1 font-display text-3xl">الألعاب والتلفاز</h1>
        </div>

        <section className="rounded-xl border border-border bg-surface p-4">
          <p className="text-sm text-muted">رصيدك</p>
          <p className="font-display text-3xl">{points} نقطة</p>
          <p className="mt-1 text-sm">
            شارتك: <NameBadge role={stats.data?.role} points={points} />
          </p>
          <ul className="mt-3 space-y-1 text-xs text-muted">
            {RANK_POINTS.slice().reverse().map((r) => (
              <li key={r.key}>
                {r.label} من {r.min} نقطة{rankLabel(points) === r.label ? " — مستواك الآن" : ""}
              </li>
            ))}
          </ul>
        </section>

        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant={tab === "games" ? "default" : "secondary"} onClick={() => setTab("games")}>
            الألعاب
          </Button>
          <Button size="sm" variant={tab === "tv" ? "default" : "secondary"} onClick={() => setTab("tv")}>
            التلفاز
          </Button>
          <Button size="sm" variant={tab === "radio" ? "default" : "secondary"} onClick={() => setTab("radio")}>
            الراديو
          </Button>
        </div>

        {tab === "games" ? (
          <>
            <SudokuGame />
            <ChessGame />
            <section className="space-y-2">
              <h2 className="text-sm">ادعُ صديقاً للعب</h2>
              {(friends.data?.friends ?? []).length === 0 ? (
                <p className="text-sm text-muted">أضف أصدقاء أولاً من تبويب الأصدقاء.</p>
              ) : (
                (friends.data?.friends ?? []).map((f) => (
                  <div key={f.id} className="flex items-center gap-3 rounded-xl border border-border bg-surface px-3 py-2.5">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm">
                        {f.peer.display_name}{" "}
                        <NameBadge badge={f.peer.badge} role={f.peer.role} points={f.peer.points} />
                      </p>
                      <p className="text-xs text-muted">@{f.peer.username ?? "بدون"}</p>
                    </div>
                    <Button
                      size="sm"
                      onClick={() =>
                        void inviteToPlay({ data: f.peer.user_id })
                          .then(() => toast.success("أُرسلت الدعوة"))
                          .catch((err) => toast.error(err instanceof Error ? err.message : "تعذر الإرسال"))
                      }
                    >
                      دعوة
                    </Button>
                  </div>
                ))
              )}
            </section>
          </>
        ) : tab === "tv" ? (
          <section className="space-y-3">
            <p className="text-sm text-muted">قنوات للمشاهدة في نافذة جديدة. البث من يوتيوب وقد يختلف حسب البلد.</p>
            {CHANNELS.map((ch) => (
              <a
                key={ch.name}
                href={ch.href}
                target="_blank"
                rel="noreferrer"
                className="block rounded-xl border border-border bg-surface px-4 py-3 text-sm hover:bg-elevated"
              >
                {ch.name}
              </a>
            ))}
          </section>
        ) : (
          <section className="space-y-3">
            <p className="text-sm text-muted">محطات للسماع داخل التطبيق أو عبر الرابط.</p>
            {RADIO.map((st) => (
              <div key={st.name} className="rounded-xl border border-border bg-surface px-4 py-3">
                <p className="text-sm">{st.name}</p>
                {"src" in st && st.src ? (
                  <audio className="mt-2 w-full" controls preload="none" src={st.src} />
                ) : "href" in st && st.href ? (
                  <a className="mt-2 inline-block text-xs text-accent" href={st.href} target="_blank" rel="noreferrer">
                    فتح المحطة
                  </a>
                ) : null}
              </div>
            ))}
          </section>
        )}
      </div>
    </AppShell>
  );
}
