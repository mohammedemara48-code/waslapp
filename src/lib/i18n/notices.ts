import type { Dict } from "./dictionaries";

export function localizeNotice(
  kind: string,
  title: string,
  body: string,
  t: Dict,
  locale: string,
): { title: string; body: string } {
  if (locale === "ar") return { title, body };
  if (kind === "call") return { title: t.notice_call || title, body };
  if (kind === "friend") {
    const accepted = /قبل|قُبل|accepted/i.test(title);
    return { title: accepted ? t.notice_friend_ok : t.notice_friend, body };
  }
  if (kind === "message") return { title: t.notice_message || title, body };
  if (kind === "story") return { title: t.notice_story || title, body };
  if (kind === "gift") return { title: t.notice_gift || title, body };
  if (kind === "presence") return { title: t.notice_presence || title, body };
  return { title, body };
}

export function parseCallHref(href: string | null | undefined): { slug: string; kind: "audio" | "video" } | null {
  if (!href) return null;
  const m = href.match(/\/r\/([a-zA-Z0-9_-]+)/);
  if (!m) return null;
  const kind = /call=video/.test(href) ? "video" : "audio";
  return { slug: m[1]!, kind };
}

export function stashCall(opts: { slug: string; kind: "audio" | "video"; ring?: boolean; answer?: boolean }) {
  try {
    sessionStorage.setItem("wasl.pendingCall", JSON.stringify(opts));
  } catch {
    /* ignore */
  }
}

export function takeStashedCall(slug: string): { kind: "audio" | "video"; ring?: boolean; answer?: boolean } | null {
  try {
    const raw = sessionStorage.getItem("wasl.pendingCall");
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { slug?: string; kind?: string; ring?: boolean; answer?: boolean };
    if (parsed.slug && parsed.slug !== slug) return null;
    sessionStorage.removeItem("wasl.pendingCall");
    const kind = parsed.kind === "video" ? "video" : "audio";
    return { kind, ring: parsed.ring, answer: parsed.answer };
  } catch {
    return null;
  }
}
