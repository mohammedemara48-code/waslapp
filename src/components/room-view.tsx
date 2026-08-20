import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Hash, Gift, ImagePlus, Menu, Mic, Paperclip, Pin, Search, Send, Star, Users, Video, X, Gamepad2, Tv } from "lucide-react";
import { toast } from "sonner";
import { getRoom, joinRoom, listMessages, listRooms, sendCallEvent, sendMessage } from "@/lib/chat/server";
import { notifyPeers } from "@/lib/social/server";
import { notifyRoomPresence, sendSticker } from "@/lib/live/server";
import { markRoomRead, pinRoomMessage, toggleMicQueue, listMicQueue, toggleSaveMessage } from "@/lib/engage/server";
import { StickerMark, StickerPicker } from "@/components/sticker-picker";
import { UserActions } from "@/components/user-actions";
import type { MessageRow } from "@/lib/chat/types";
import { useP2PRoom } from "@/lib/multiplayer";
import { useMediaRoom } from "@/lib/media/use-media-room";
import { useCurrentUser } from "@/lib/auth/use-current-user";
import { cn, fileToAttachment, formatClock, formatDay, initials, peerIdFromUser } from "@/lib/utils";
import { NotificationBell } from "@/components/notification-bell";
import { AccountMenu } from "@/components/account-menu";
import { BrandMark } from "@/components/brand-mark";
import { CallStage } from "@/components/call-stage";
import { MessageMedia } from "@/components/message-media";
import { VoiceNoteButton } from "@/components/voice-note-button";
import { startCallTone, stopCallTone } from "@/lib/call-tone";
import { playMessageSound } from "@/lib/pwa";
import { RoomList } from "@/components/room-list";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";

type WireChat = {
  type: "chat";
  id: number;
  body: string;
  user_id: string;
  display_name: string;
  avatar_url: string | null;
  created_at: string;
  attachment_name: string | null;
  attachment_type: string | null;
  attachment_data: string | null;
};

type WireTyping = { type: "typing"; name: string };
type WireCall = { type: "call"; kind: "audio" | "video"; name: string };
type WireCallEnd = { type: "call-end"; reason?: "reject" | "hangup" };

function mergeMessages(current: MessageRow[], incoming: MessageRow[]): MessageRow[] {
  const map = new Map<number, MessageRow>();
  for (const m of current) map.set(m.id, m);
  for (const m of incoming) map.set(m.id, m);
  return [...map.values()].sort((a, b) => a.id - b.id);
}

export function RoomView({ slug }: { slug: string }) {
  const user = useCurrentUser();
  const queryClient = useQueryClient();
  const [tabId] = useState(() => Math.random().toString(36).slice(2, 6));
  const selfId = useMemo(
    () => (user ? peerIdFromUser(user.id, tabId) : `p-${slug}${tabId}`.slice(0, 64)),
    [user, slug, tabId],
  );
  const displayName = user?.displayName ?? "ضيف";

  const roomsQuery = useQuery({
    queryKey: ["rooms"],
    queryFn: () => listRooms(),
    refetchInterval: 10000,
  });
  const roomQuery = useQuery({
    queryKey: ["room", slug],
    queryFn: () => getRoom({ data: slug }),
  });
  const messagesQuery = useQuery({
    queryKey: ["messages", slug],
    queryFn: () => listMessages({ data: { slug } }),
    refetchInterval: 4000,
  });
  const micQuery = useQuery({
    queryKey: ["mic", slug],
    queryFn: () => listMicQueue({ data: slug }),
    refetchInterval: 5000,
  });

  const [draft, setDraft] = useState("");
  const [filter, setFilter] = useState("");
  const [sending, setSending] = useState(false);
  const [attachment, setAttachment] = useState<{ name: string; type: string; data: string } | null>(null);
  const [viewOnce, setViewOnce] = useState(false);
  const [roomsOpen, setRoomsOpen] = useState(false);
  const [peopleOpen, setPeopleOpen] = useState(false);
  const [callKind, setCallKind] = useState<"audio" | "video" | null>(null);
  const [incoming, setIncoming] = useState<{ kind: "audio" | "video"; name: string } | null>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [muted, setMuted] = useState(false);
  const [cameraOn, setCameraOn] = useState(false);
  const [typingName, setTypingName] = useState<string | null>(null);
  const [giftsOpen, setGiftsOpen] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const incomingRef = useRef(incoming);
  const callKindRef = useRef(callKind);
  incomingRef.current = incoming;
  callKindRef.current = callKind;

  useEffect(() => {
    void joinRoom({ data: slug }).then(() => {
      void markRoomRead({ data: slug }).then(() => queryClient.invalidateQueries({ queryKey: ["inbox"] }));
      void queryClient.invalidateQueries({ queryKey: ["room", slug] });
      void queryClient.invalidateQueries({ queryKey: ["rooms"] });
      void queryClient.invalidateQueries({ queryKey: ["dms"] });
      void notifyRoomPresence({ data: { slug, name: slug } }).catch(() => {});
    });
  }, [slug, queryClient]);

  const p2p = useP2PRoom({
    room: `chat-${slug}`.slice(0, 64),
    name: displayName.slice(0, 64),
    selfId,
    enabled: Boolean(user),
  });

  const media = useMediaRoom({
    room: `call-${slug}`.slice(0, 64),
    selfId,
    name: displayName.slice(0, 64),
    enabled: callKind !== null,
    stream: localStream,
  });

  useEffect(() => {
    return p2p.onMessage((_from, data) => {
      if (!data || typeof data !== "object") return;
      const msg = data as WireChat | WireTyping | WireCall | WireCallEnd;
      if (msg.type === "chat") {
        const row: MessageRow = {
          id: msg.id,
          room_id: 0,
          user_id: msg.user_id,
          body: msg.body,
          created_at: msg.created_at,
          display_name: msg.display_name,
          avatar_url: msg.avatar_url,
          attachment_name: msg.attachment_name ?? null,
          attachment_type: msg.attachment_type ?? null,
          attachment_data: msg.attachment_data ?? null,
        };
        queryClient.setQueryData<MessageRow[]>(["messages", slug], (prev) =>
          mergeMessages(prev ?? [], [row]),
        );
      } else if (msg.type === "typing") {
        setTypingName(msg.name);
        if (typingTimer.current) clearTimeout(typingTimer.current);
        typingTimer.current = setTimeout(() => setTypingName(null), 1800);
      } else if (msg.type === "call") {
        setIncoming({ kind: msg.kind, name: msg.name });
        startCallTone("in");
      } else if (msg.type === "call-end") {
        setIncoming(null);
        stopCallTone();
      }
    });
  }, [p2p.onMessage, queryClient, slug]);

  const messages = (messagesQuery.data ?? []).filter((m) =>
    filter.trim()
      ? `${m.body} ${m.display_name}`.toLowerCase().includes(filter.trim().toLowerCase())
      : true,
  );
  const lastMsgId = useRef(0);
  useEffect(() => {
    const list = messagesQuery.data ?? [];
    if (!list.length) return;
    const last = list[list.length - 1]!;
    if (lastMsgId.current === 0) {
      lastMsgId.current = last.id;
      return;
    }
    if (last.id > lastMsgId.current && last.user_id !== user?.id) {
      playMessageSound();
    }
    lastMsgId.current = Math.max(lastMsgId.current, last.id);
  }, [messagesQuery.data, user?.id]);
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length, callKind]);

  useEffect(() => {
    return () => {
      localStream?.getTracks().forEach((t) => t.stop());
    };
  }, [localStream]);

  async function startCall(kind: "audio" | "video") {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: kind === "video",
      });
      setLocalStream(stream);
      setMuted(false);
      setCameraOn(kind === "video");
      setCallKind(kind);
      p2p.send({ type: "call", kind, name: displayName });
      void notifyPeers({
        data: {
          slug,
          kind: "call",
          title: kind === "video" ? "مكالمة فيديو" : "مكالمة صوتية",
          body: `${displayName} بدأ مكالمة`,
        },
      }).catch(() => {});
    } catch {
      toast.error("تعذر الوصول إلى الميكروفون أو الكاميرا. تحقق من الإذن ثم أعد المحاولة.");
    }
  }

  function hangup(status?: "no-answer" | "ended" | "rejected") {
    const kind = callKind;
    const answered = media.remotes.length > 0;
    localStream?.getTracks().forEach((t) => t.stop());
    setLocalStream(null);
    setCallKind(null);
    setCameraOn(false);
    setMuted(false);
    setIncoming(null);
    stopCallTone();
    p2p.send({ type: "call-end", reason: status === "rejected" ? "reject" : "hangup" });
    if (kind && status) {
      void sendCallEvent({ data: { slug, kind, status } })
        .then((saved) => {
          queryClient.setQueryData<MessageRow[]>(["messages", slug], (prev) => mergeMessages(prev ?? [], [saved]));
        })
        .catch(() => {});
    } else if (kind && !answered) {
      void sendCallEvent({ data: { slug, kind, status: "no-answer" } })
        .then((saved) => {
          queryClient.setQueryData<MessageRow[]>(["messages", slug], (prev) => mergeMessages(prev ?? [], [saved]));
        })
        .catch(() => {});
    }
  }

  useEffect(() => {
    if (!callKind || media.remotes.length > 0) return;
    const t = window.setTimeout(() => {
      toast.message("لم يتم الرد");
      hangup("no-answer");
    }, 35000);
    return () => window.clearTimeout(t);
  }, [callKind, media.remotes.length]);

  function toggleMute() {
    const next = !muted;
    localStream?.getAudioTracks().forEach((t) => {
      t.enabled = !next;
    });
    setMuted(next);
  }

  async function toggleCamera() {
    if (!localStream) return;
    const video = localStream.getVideoTracks()[0];
    if (video) {
      const next = !cameraOn;
      video.enabled = next;
      setCameraOn(next);
      return;
    }
    try {
      const extra = await navigator.mediaDevices.getUserMedia({ video: true });
      extra.getVideoTracks().forEach((t) => localStream.addTrack(t));
      setLocalStream(localStream.clone());
      setCameraOn(true);
      setCallKind("video");
    } catch {
      toast.error("تعذر تشغيل الكاميرا.");
    }
  }

  async function submit() {
    const body = draft.trim();
    if ((!body && !attachment) || sending || !user) return;
    setSending(true);
    setDraft("");
    const pending = attachment;
    const once = viewOnce;
    setAttachment(null);
    setViewOnce(false);
    try {
      const saved = await sendMessage({ data: { slug, body, attachment: pending, viewOnce: once } });
      queryClient.setQueryData<MessageRow[]>(["messages", slug], (prev) =>
        mergeMessages(prev ?? [], [saved]),
      );
      p2p.send({
        type: "chat",
        id: saved.id,
        body: saved.body,
        user_id: saved.user_id,
        display_name: saved.display_name,
        avatar_url: saved.avatar_url,
        created_at: saved.created_at,
        attachment_name: saved.attachment_name,
        attachment_type: saved.attachment_type,
        attachment_data: saved.attachment_data,
      } satisfies WireChat);
      void queryClient.invalidateQueries({ queryKey: ["rooms"] });
      void queryClient.invalidateQueries({ queryKey: ["dms"] });
    } catch (err) {
      setDraft(body);
      setAttachment(pending);
      toast.error(err instanceof Error ? err.message : "تعذر الإرسال");
    } finally {
      setSending(false);
    }
  }

  function onDraft(value: string) {
    setDraft(value);
    if (value.trim()) p2p.broadcast({ type: "typing", name: displayName } satisfies WireTyping);
  }

  const room = roomQuery.data?.room;
  const members = roomQuery.data?.members ?? [];
  if (roomQuery.isError) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-3 bg-bg px-6 text-center text-fg">
        <p className="font-display text-3xl">هذه الغرفة غير موجودة</p>
        <Link to="/" className="text-sm text-accent hover:underline">
          العودة إلى الغرف
        </Link>
      </div>
    );
  }
  const livePeers = p2p.peers.filter((p) => p.connectionState === "connected");

  const grouped = useMemo(() => {
    const days: { day: string; items: MessageRow[] }[] = [];
    for (const msg of messages) {
      const day = formatDay(msg.created_at);
      const last = days[days.length - 1];
      if (!last || last.day !== day) days.push({ day, items: [msg] });
      else last.items.push(msg);
    }
    return days;
  }, [messages]);

  const peoplePanel = (
    <div className="flex h-full flex-col">
      <p className="mb-3 text-xs text-subtle">في الغرفة الآن</p>
      <ul className="space-y-2">
        {user ? (
          <li className="flex items-center gap-2.5">
            <Avatar className="size-8">
              {user.profileImageUrl ? <AvatarImage src={user.profileImageUrl} alt="" /> : null}
              <AvatarFallback>{initials(displayName)}</AvatarFallback>
            </Avatar>
            <span className="min-w-0 flex-1 truncate text-sm">{displayName}</span>
            <Badge variant="ok">أنت</Badge>
          </li>
        ) : null}
        {livePeers.map((peer) => (
          <li key={peer.id} className="flex items-center gap-2.5">
            <Avatar className="size-8">
              <AvatarFallback>{initials(peer.name)}</AvatarFallback>
            </Avatar>
            <span className="min-w-0 flex-1 truncate text-sm">{peer.name || "مشارك"}</span>
            <span className="size-1.5 rounded-full bg-ok" />
          </li>
        ))}
        {members
          .filter((m) => m.user_id !== user?.id)
          .map((member) => (
            <li key={member.user_id} className="flex items-center gap-2.5">
              <UserActions person={member}>
                <button type="button" className="flex min-w-0 flex-1 items-center gap-2.5 text-right">
                  <Avatar className="size-8">
                    {member.avatar_url ? <AvatarImage src={member.avatar_url} alt="" /> : null}
                    <AvatarFallback>{initials(member.display_name)}</AvatarFallback>
                  </Avatar>
                  <span className="min-w-0 flex-1 truncate text-sm text-muted">{member.display_name}</span>
                </button>
              </UserActions>
            </li>
          ))}
      </ul>
      <div className="mt-4">
        <Button
          size="sm"
          variant="secondary"
          className="w-full"
          onClick={() =>
            void toggleMicQueue({ data: slug }).then(() => queryClient.invalidateQueries({ queryKey: ["mic", slug] }))
          }
        >
          <Mic className="size-4" />
          طلب المايك
        </Button>
        {(micQuery.data ?? []).length > 0 ? (
          <ol className="mt-2 space-y-1 text-xs text-muted">
            {(micQuery.data ?? []).map((p, i) => (
              <li key={p.user_id}>
                {i + 1}. {p.display_name}
              </li>
            ))}
          </ol>
        ) : null}
      </div>
    </div>
  );

  return (
    <div className="flex min-h-dvh bg-bg text-fg">
      <aside className="hidden w-72 shrink-0 flex-col border-l border-border bg-surface p-4 lg:flex">
        <div className="mb-5 flex items-center justify-between">
          <Link to="/" className="outline-none">
            <BrandMark size="sm" />
          </Link>
          <AccountMenu />
        </div>
        <RoomList
          rooms={roomsQuery.data ?? []}
          activeSlug={slug}
          onRefresh={() => void roomsQuery.refetch()}
        />
      </aside>

      <section className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center gap-3 border-b border-border px-3 py-3 md:px-5">
          <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setRoomsOpen(true)}>
            <Menu />
          </Button>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <Hash className="size-4 text-accent" />
              <h1 className="truncate text-base font-medium">{room?.name ?? "…"}</h1>
            </div>
            <p className="truncate text-xs text-muted">{room?.description}</p>
          </div>
          <label className="relative hidden sm:block">
            <Search className="pointer-events-none absolute top-1/2 right-2 size-3.5 -translate-y-1/2 text-subtle" />
            <input
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="بحث"
              className="h-9 w-28 rounded-md border border-border bg-elevated pe-2 ps-7 text-xs"
            />
          </label>
          <div className="flex items-center gap-1">
            <Link to="/tools" className="grid size-9 place-items-center rounded-md text-muted hover:bg-elevated hover:text-fg" aria-label="الألعاب">
              <Gamepad2 className="size-4" />
            </Link>
            <Link to="/broadcast" className="grid size-9 place-items-center rounded-md text-muted hover:bg-elevated hover:text-fg" aria-label="تلفاز وراديو">
              <Tv className="size-4" />
            </Link>
            <NotificationBell />
            <Button variant="secondary" size="sm" onClick={() => void startCall("audio")} disabled={callKind !== null}>
              <Mic className="size-4" />
              <span className="hidden sm:inline">صوت</span>
            </Button>
            <Button variant="secondary" size="sm" onClick={() => void startCall("video")} disabled={callKind !== null}>
              <Video className="size-4" />
              <span className="hidden sm:inline">فيديو</span>
            </Button>
            <Button variant="ghost" size="icon" className="xl:hidden" onClick={() => setPeopleOpen(true)}>
              <Users />
            </Button>
          </div>
        </header>

        <div className="flex min-h-0 flex-1">
          <div className="flex min-w-0 flex-1 flex-col">
            {incoming && !callKind ? (
              <div className="border-b border-border-strong bg-surface p-4">
                <p className="text-sm">
                  مكالمة {incoming.kind === "video" ? "فيديو" : "صوت"} من {incoming.name}
                </p>
                <div className="mt-3 flex gap-2">
                  <Button
                    onClick={() => {
                      stopCallTone();
                      setIncoming(null);
                      void startCall(incoming.kind);
                    }}
                  >
                    رد
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => {
                      const kind = incoming.kind;
                      setIncoming(null);
                      stopCallTone();
                      p2p.send({ type: "call-end", reason: "reject" });
                      void sendCallEvent({ data: { slug, kind, status: "rejected" } })
                        .then((saved) => {
                          queryClient.setQueryData<MessageRow[]>(["messages", slug], (prev) =>
                            mergeMessages(prev ?? [], [saved]),
                          );
                        })
                        .catch(() => {});
                    }}
                  >
                    رفض
                  </Button>
                </div>
              </div>
            ) : null}
            {callKind ? (
              <div className="border-b border-border p-3 md:p-4">
                <CallStage
                  kind={callKind}
                  localStream={localStream}
                  remotes={media.remotes}
                  muted={muted}
                  cameraOn={cameraOn}
                  onToggleMute={toggleMute}
                  onToggleCamera={() => void toggleCamera()}
                  onHangup={hangup}
                />
              </div>
            ) : null}

            <ScrollArea className="flex-1">
              <div className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-6 md:px-8">
                {roomQuery.data?.pinned ? (
                  <div className="flex items-start gap-2 rounded-lg border border-accent/40 bg-elevated px-3 py-2 text-sm">
                    <Pin className="mt-0.5 size-3.5 text-accent" />
                    <span className="min-w-0">
                      <span className="block text-[11px] text-subtle">مثبّت · {roomQuery.data.pinned.display_name}</span>
                      {roomQuery.data.pinned.body}
                    </span>
                  </div>
                ) : null}
                {grouped.length === 0 && !messagesQuery.isPending ? (
                  <div className="rounded-xl border border-dashed border-border px-6 py-16 text-center">
                    <p className="font-display text-2xl">الغرفة هادئة</p>
                    <p className="mt-2 text-sm text-muted">اكتب أول رسالة، أو ابدأ مكالمة وانتظر من يصل.</p>
                  </div>
                ) : null}
                {grouped.map((group) => (
                  <div key={group.day} className="space-y-3">
                    <p className="text-center text-[11px] tracking-wide text-subtle">{group.day}</p>
                    {group.items.map((msg) => {
                      const mine = msg.user_id === user?.id;
                      return (
                        <article
                          key={msg.id}
                          className={cn("flex gap-2.5", mine ? "flex-row-reverse" : "flex-row")}
                        >
                          <Avatar className="mt-1 size-8">
                            {msg.avatar_url ? <AvatarImage src={msg.avatar_url} alt="" /> : null}
                            <AvatarFallback>{initials(msg.display_name)}</AvatarFallback>
                          </Avatar>
                          <div className={cn("max-w-[min(100%,32rem)]", mine ? "items-end" : "items-start")}>
                            <div className="mb-1 flex items-baseline gap-2 text-xs text-subtle">
                              <UserActions
                                person={{
                                  user_id: msg.user_id,
                                  display_name: msg.display_name,
                                  username: null,
                                  avatar_url: msg.avatar_url,
                                }}
                              >
                                <button type="button" className="text-muted hover:text-fg">
                                  {msg.display_name}
                                </button>
                              </UserActions>
                              <time dateTime={msg.created_at}>{formatClock(msg.created_at)}</time>
                            </div>
                            <div
                              className={cn(
                                "rounded-lg px-3.5 py-2.5 text-sm leading-relaxed",
                                mine ? "bg-accent text-accent-fg rounded-tl-sm" : "bg-elevated text-fg rounded-tr-sm",
                              )}
                            >
                              {msg.body && msg.attachment_type !== "call-event" ? <p>{msg.body}</p> : null}
                              {msg.attachment_type === "sticker" ? (
                                <p className="mt-2 flex items-center gap-2 font-display text-xl">
                                  <StickerMark id={msg.attachment_name ?? "gift"} className="size-6" />
                                  {msg.attachment_data || msg.body}
                                </p>
                              ) : (
                                <MessageMedia msg={msg} mine={mine} />
                              )}
                            </div>
                            <div className="mt-1 flex gap-1">
                              <button
                                type="button"
                                className="text-subtle hover:text-fg"
                                aria-label="حفظ"
                                onClick={() =>
                                  void toggleSaveMessage({ data: msg.id }).then((r) =>
                                    toast.success(r.saved ? "حُفظت الرسالة" : "أُزيلت من المحفوظات"),
                                  )
                                }
                              >
                                <Star className="size-3.5" />
                              </button>
                              {room?.created_by === user?.id ? (
                                <button
                                  type="button"
                                  className="text-subtle hover:text-fg"
                                  aria-label="تثبيت"
                                  onClick={() =>
                                    void pinRoomMessage({ data: { slug, messageId: msg.id } }).then(() => {
                                      toast.success("ثُبّتت الرسالة");
                                      void queryClient.invalidateQueries({ queryKey: ["room", slug] });
                                    })
                                  }
                                >
                                  <Pin className="size-3.5" />
                                </button>
                              ) : null}
                            </div>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                ))}
                {typingName ? <p className="text-xs text-subtle">{typingName} يكتب…</p> : null}
                <div ref={bottomRef} />
              </div>
            </ScrollArea>

            <form
              className="border-t border-border p-3 md:px-6 md:py-4"
              onSubmit={(e) => {
                e.preventDefault();
                void submit();
              }}
            >
              <div className="mx-auto flex max-w-3xl flex-col gap-2">
                {attachment ? (
                  <div className="flex items-center justify-between gap-2 rounded-md border border-border bg-elevated px-3 py-2 text-xs">
                    <span className="truncate">{attachment.name}</span>
                    <label className="flex shrink-0 items-center gap-1 text-[11px] text-muted">
                      <input type="checkbox" checked={viewOnce} onChange={(e) => setViewOnce(e.target.checked)} />
                      مرة واحدة
                    </label>
                    <button type="button" onClick={() => setAttachment(null)} aria-label="إزالة المرفق">
                      <X className="size-3.5" />
                    </button>
                  </div>
                ) : null}
                {giftsOpen ? (
                  <StickerPicker
                    onPick={(id) => {
                      setGiftsOpen(false);
                      void sendSticker({ data: { slug, stickerId: id } })
                        .then((saved) => {
                          queryClient.setQueryData<MessageRow[]>(["messages", slug], (prev) =>
                            mergeMessages(prev ?? [], [saved]),
                          );
                          p2p.send({
                            type: "chat",
                            id: saved.id,
                            body: saved.body,
                            user_id: saved.user_id,
                            display_name: saved.display_name,
                            avatar_url: saved.avatar_url,
                            created_at: saved.created_at,
                            attachment_name: saved.attachment_name,
                            attachment_type: saved.attachment_type,
                            attachment_data: saved.attachment_data,
                          } satisfies WireChat);
                        })
                        .catch((err) => toast.error(err instanceof Error ? err.message : "تعذر الإرسال"));
                    }}
                  />
                ) : null}
                <div className="flex items-end gap-2">
                <Button type="button" variant="secondary" size="icon" onClick={() => setGiftsOpen((v) => !v)} aria-label="هدايا">
                  <Gift />
                </Button>
                <label className="grid size-11 shrink-0 place-items-center rounded-md border border-border bg-elevated text-muted hover:text-fg">
                  <ImagePlus className="size-4" />
                  <span className="sr-only">صورة</span>
                  <input type="file" accept="image/*" className="sr-only"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      e.target.value = "";
                      if (!file) return;
                      void fileToAttachment(file)
                        .then(setAttachment)
                        .catch((err) => toast.error(err instanceof Error ? err.message : "تعذر الإرفاق"));
                    }}
                  />
                </label>
                <label className="grid size-11 shrink-0 place-items-center rounded-md border border-border bg-elevated text-muted hover:text-fg">
                  <Video className="size-4" />
                  <span className="sr-only">فيديو</span>
                  <input type="file" accept="video/*" className="sr-only"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      e.target.value = "";
                      if (!file) return;
                      void fileToAttachment(file)
                        .then(setAttachment)
                        .catch((err) => toast.error(err instanceof Error ? err.message : "تعذر الإرفاق"));
                    }}
                  />
                </label>
                <label className="grid size-11 shrink-0 place-items-center rounded-md border border-border bg-elevated text-muted hover:text-fg">
                  <Paperclip className="size-4" />
                  <span className="sr-only">ملف</span>
                  <input type="file" className="sr-only"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      e.target.value = "";
                      if (!file) return;
                      void fileToAttachment(file)
                        .then(setAttachment)
                        .catch((err) => toast.error(err instanceof Error ? err.message : "تعذر الإرفاق"));
                    }}
                  />
                </label>
                <VoiceNoteButton
                  disabled={sending}
                  onReady={(file) => {
                    setAttachment(file);
                  }}
                />
                <Textarea
                  value={draft}
                  onChange={(e) => onDraft(e.target.value)}
                  placeholder={room?.kind === "dm" ? "رسالة خاصة…" : "اكتب رسالة…"}
                  rows={1}
                  className="max-h-32 min-h-11"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      void submit();
                    }
                  }}
                />
                <Button type="submit" size="icon" disabled={sending || (!draft.trim() && !attachment)} aria-label="إرسال">
                  <Send />
                </Button>
                </div>
              </div>
            </form>
          </div>

          <aside className="hidden w-64 shrink-0 border-r border-border bg-surface p-4 xl:block">
            {peoplePanel}
          </aside>
        </div>
      </section>

      <Sheet open={roomsOpen} onOpenChange={setRoomsOpen}>
        <SheetContent side="right">
          <SheetHeader>
            <SheetTitle>الغرف</SheetTitle>
          </SheetHeader>
          <RoomList
            rooms={roomsQuery.data ?? []}
            activeSlug={slug}
            onRefresh={() => void roomsQuery.refetch()}
          />
        </SheetContent>
      </Sheet>

      <Sheet open={peopleOpen} onOpenChange={setPeopleOpen}>
        <SheetContent side="left">
          <SheetHeader>
            <SheetTitle>الحاضرون</SheetTitle>
          </SheetHeader>
          {peoplePanel}
        </SheetContent>
      </Sheet>
    </div>
  );
}
