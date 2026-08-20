import { useState } from "react";
import { NEWS_TV, RADIO_STATIONS } from "@/lib/broadcast";
import { useRadio } from "@/lib/radio";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";

export function BroadcastPage() {
  const radio = useRadio();
  const [tab, setTab] = useState<"tv" | "radio">("tv");
  const [tv, setTv] = useState(NEWS_TV[0]!.channel);

  return (
    <AppShell active="broadcast">
      <div className="mx-auto w-full max-w-2xl space-y-6 px-5 py-8">
        <div>
          <p className="text-sm text-accent">بث مباشر داخل وصل</p>
          <h1 className="mt-1 font-display text-3xl">التلفاز والراديو</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant={tab === "tv" ? "default" : "secondary"} onClick={() => setTab("tv")}>
            التلفاز
          </Button>
          <Button size="sm" variant={tab === "radio" ? "default" : "secondary"} onClick={() => setTab("radio")}>
            الراديو
          </Button>
        </div>

        {tab === "tv" ? (
          <section className="space-y-3">
            <p className="text-sm text-muted">القنوات تعمل داخل الصفحة. لو بث مش على الهواء جرّب قناة تانية.</p>
            <div className="flex flex-wrap gap-1.5">
              {NEWS_TV.map((ch) => (
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
            <p className="text-sm text-muted">الراديو يكمل وأنت بتتنقل أو تلعب. شريط صغير يظهر أسفل الشاشة.</p>
            {(["مصر", "عربي"] as const).map((region) => (
              <div key={region} className="space-y-2">
                <h2 className="text-xs text-subtle">{region}</h2>
                {RADIO_STATIONS.filter((s) => s.region === region).map((st) => {
                  const on = radio.station?.src === st.src;
                  return (
                    <button
                      key={st.src}
                      type="button"
                      onClick={() => (on && radio.playing ? radio.toggle() : radio.play(st))}
                      className="flex w-full items-center justify-between rounded-xl border border-border bg-surface px-4 py-3 text-right text-sm hover:bg-elevated"
                    >
                      <span>{st.name}</span>
                      <span className="text-xs text-accent">{on && radio.playing ? "يعمل" : "تشغيل"}</span>
                    </button>
                  );
                })}
              </div>
            ))}
          </section>
        )}
      </div>
    </AppShell>
  );
}
