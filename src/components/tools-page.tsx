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

const EGYPT_TV = [
  { name: "إكسترا نيوز", channel: "UC65F33K2cXk9hGDbOQYhTOw" },
  { name: "النيل للأخبار", channel: "UCqNEIF-M6df1pAth2pUVFdQ" },
  { name: "ON", channel: "UCZghOmDezc6OCMzdPaL-j2Q" },
  { name: "DMC", channel: "UCEeFa7t5I0fqpcLGF-36TEw" },
  { name: "TEN", channel: "UChrHIeTNFl00eIUW4KdJBcw" },
  { name: "القناة الأولى", channel: "UCU2EMBWN2XnA4r3kha-EdJQ" },
];

const EGYPT_RADIO = [
  { name: "الراديو 9090", src: "https://9090streaming.mobtada.com/9090FMEGYPT" },
  { name: "إذاعة القرآن الكريم", src: "https://backup.qurango.net/radio/tarateel" },
];

export function ToolsPage() {
  const friends = useQuery({ queryKey: ["friends"], queryFn: () => listFriends() });
  const stats = useQuery({ queryKey: ["my-points"], queryFn: () => getMyPoints() });
  const [tab, setTab] = useState<"games" | "tv" | "radio">("games");
  const [tv, setTv] = useState(EGYPT_TV[0]!.channel);
  const [radio, setRadio] = useState(EGYPT_RADIO[0]!.src);
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
            <p className="text-sm text-muted">قنوات مصرية تشتغل جوّه التطبيق (بث يوتيوب المباشر). لو قناة مش على الهواء هتظهر فارغة — جرّب غيرها.</p>
            <div className="flex flex-wrap gap-1.5">
              {EGYPT_TV.map((ch) => (
                <Button key={ch.channel} size="sm" variant={tv === ch.channel ? "default" : "secondary"} onClick={() => setTv(ch.channel)}>
                  {ch.name}
                </Button>
              ))}
            </div>
            <div className="overflow-hidden rounded-xl border border-border bg-elevated">
              <iframe
                key={tv}
                title="بث مباشر"
                className="aspect-video w-full"
                src={`https://www.youtube-nocookie.com/embed/live_stream?channel=${tv}&rel=0`}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
                allowFullScreen
                referrerPolicy="strict-origin-when-cross-origin"
              />
            </div>
          </section>
        ) : (
          <section className="space-y-3">
            <p className="text-sm text-muted">محطات مصرية تشتغل مباشرة من هنا.</p>
            <div className="flex flex-wrap gap-1.5">
              {EGYPT_RADIO.map((st) => (
                <Button key={st.src} size="sm" variant={radio === st.src ? "default" : "secondary"} onClick={() => setRadio(st.src)}>
                  {st.name}
                </Button>
              ))}
            </div>
            <div className="rounded-xl border border-border bg-surface px-4 py-3">
              <p className="mb-2 text-sm">{EGYPT_RADIO.find((s) => s.src === radio)?.name}</p>
              <audio key={radio} className="w-full" controls preload="none" src={radio} />
            </div>
          </section>
        )}
      </div>
    </AppShell>
  );
}
