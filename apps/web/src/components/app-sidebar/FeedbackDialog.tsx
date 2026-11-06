"use client";

import { useEffect, useState } from "react";
import { ArrowLeftIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useToast } from "@/components/Toast";
import { apiFetch } from "@/lib/api";
import { cn } from "@/lib/cn";
import { TONE } from "@/lib/tone";

type FeedbackType = "bug" | "feature" | "general";

interface Reply {
  id: string;
  sender: string;
  message: string;
  createdAt: string;
}

interface Feedback {
  id: string;
  type: string;
  message: string;
  unreadByUser: number;
  createdAt: string;
  replies: Reply[];
}

// `on` is the chip's colour while selected. Written out in full (not built from TONE) so Tailwind sees every class;
// "general" keeps the toggle's own brand colour.
const TYPES: { value: FeedbackType; label: string; on: string; placeholder: string }[] = [
  {
    value: "bug",
    label: "🐛 Bug",
    on: "data-[state=on]:border-red-200 data-[state=on]:bg-red-50 data-[state=on]:text-red-600 data-[state=on]:hover:text-red-600",
    placeholder: "What happened? What did you expect?",
  },
  {
    value: "feature",
    label: "✨ Feature",
    on: "data-[state=on]:border-green-200 data-[state=on]:bg-green-50 data-[state=on]:text-green-700 data-[state=on]:hover:text-green-700",
    placeholder: "What would you like to see?",
  },
  { value: "general", label: "💬 General", on: "", placeholder: "What's on your mind?" },
];

const typeLabel = (t: string) => TYPES.find((x) => x.value === t)?.label ?? TYPES[2].label;

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Tell the sidebar how many answers are waiting, for the red badge. */
  onUnreadChange: (count: number) => void;
};

/** Send a report or a request, and read the team's answers ("My feedback"). */
export function FeedbackDialog({ open, onOpenChange, onUnreadChange }: Props) {
  const { success, error } = useToast();
  const [tab, setTab] = useState<"send" | "mine">("send");
  const [type, setType] = useState<FeedbackType>("general");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  const [mine, setMine] = useState<Feedback[]>([]);
  const [mineLoading, setMineLoading] = useState(false);
  const [openThread, setOpenThread] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [replying, setReplying] = useState(false);

  async function loadMine() {
    setMineLoading(true);
    try {
      const data = await apiFetch<Feedback[]>("/feedback/mine");
      setMine(data);
      onUnreadChange(data.reduce((sum, f) => sum + f.unreadByUser, 0));
    } catch {
      /* silent: the list just stays as it was */
    } finally {
      setMineLoading(false);
    }
  }

  // Opening the "My feedback" tab loads it (also when the dialog opens on that tab)
  useEffect(() => {
    if (open && tab === "mine") void loadMine();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, tab]);

  function reset() {
    setTab("send");
    setType("general");
    setMessage("");
    setOpenThread(null);
    setDraft("");
  }

  function handleOpenChange(next: boolean) {
    if (!next) reset();
    onOpenChange(next);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const text = message.trim();
    if (!text) return;
    setSending(true);
    try {
      await apiFetch("/feedback", { method: "POST", body: JSON.stringify({ type, message: text, url: window.location.pathname }) });
      success("Thanks for your feedback!");
      handleOpenChange(false);
    } catch {
      error("Failed to send feedback. Try again.");
    } finally {
      setSending(false);
    }
  }

  async function markRead(id: string, unread: number) {
    await apiFetch(`/feedback/${id}/read`, { method: "POST" }).catch(() => {});
    setMine((prev) => prev.map((f) => (f.id === id ? { ...f, unreadByUser: 0 } : f)));
    onUnreadChange(Math.max(0, mine.reduce((sum, f) => sum + f.unreadByUser, 0) - unread));
  }

  async function sendReply(feedbackId: string) {
    const text = draft.trim();
    if (!text) return;
    setReplying(true);
    try {
      const reply = await apiFetch<Reply>(`/feedback/${feedbackId}/replies`, { method: "POST", body: JSON.stringify({ message: text }) });
      setMine((prev) => prev.map((f) => (f.id === feedbackId ? { ...f, replies: [...f.replies, reply] } : f)));
      setDraft("");
    } catch {
      /* silent */
    } finally {
      setReplying(false);
    }
  }

  const thread = openThread ? mine.find((f) => f.id === openThread) : undefined;
  const current = TYPES.find((t) => t.value === type)!;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader className="sr-only">
          <DialogTitle>Feedback</DialogTitle>
          <DialogDescription>Send feedback to the team or read their answers.</DialogDescription>
        </DialogHeader>

        <Tabs value={tab} onValueChange={(v) => setTab(v as "send" | "mine")}>
          <TabsList className="w-full" aria-label="Feedback">
            <TabsTrigger value="send" className="flex-1">Send feedback</TabsTrigger>
            <TabsTrigger value="mine" className="flex-1">My feedback</TabsTrigger>
          </TabsList>

          <TabsContent value="send" className="pt-4">
            <h2 className="mb-1 type-body-sb-m text-fg">Send feedback</h2>
            <p className="mb-4 type-body-r-xs text-muted">Report a bug or suggest a feature — we read every message.</p>
            <form onSubmit={submit} className="space-y-4">
              <ToggleGroup type="single" value={type} onValueChange={(v) => setType(v as FeedbackType)} aria-label="Type" className="w-full flex-nowrap">
                {TYPES.map((t) => (
                  <ToggleGroupItem key={t.value} value={t.value} className={cn("flex-1 justify-center py-1.5", t.on)}>
                    {t.label}
                  </ToggleGroupItem>
                ))}
              </ToggleGroup>
              <Textarea
                autoFocus
                aria-label="Your message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder={current.placeholder}
                rows={4}
                required
                className="resize-none"
              />
              <DialogFooter>
                <Button type="button" variant="secondary" onClick={() => handleOpenChange(false)}>Cancel</Button>
                <Button type="submit" disabled={sending || !message.trim()}>{sending ? "Sending…" : "Send feedback"}</Button>
              </DialogFooter>
            </form>
          </TabsContent>

          <TabsContent value="mine" className="pt-4">
            {mineLoading ? (
              <p className="py-8 text-center type-body-r-xs text-muted">Loading…</p>
            ) : thread ? (
              <div>
                <Button variant="ghost" size="sm" className="mb-3 -ml-2" onClick={() => setOpenThread(null)}>
                  <ArrowLeftIcon /> Back
                </Button>
                <div className="mb-3 max-h-64 space-y-2 overflow-y-auto">
                  {thread.replies.map((r) => (
                    <div key={r.id} className={cn("flex", r.sender === "user" ? "justify-end" : "justify-start")}>
                      <div className={cn("max-w-[85%] rounded-xl border px-3 py-2", r.sender === "user" ? "border-border bg-neutral-100" : TONE.success)}>
                        {r.sender === "admin" && <p className="mb-0.5 type-body-sb-xxs">Posthive</p>}
                        <p className="whitespace-pre-wrap type-body-r-xs text-fg">{r.message}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Input
                    aria-label="Reply"
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        void sendReply(thread.id);
                      }
                    }}
                    placeholder="Reply…"
                    className="flex-1"
                  />
                  <Button onClick={() => void sendReply(thread.id)} disabled={replying || !draft.trim()}>
                    {replying ? "…" : "Send"}
                  </Button>
                </div>
              </div>
            ) : mine.length === 0 ? (
              <p className="py-8 text-center type-body-r-xs text-muted">No feedback submitted yet.</p>
            ) : (
              <div className="max-h-80 space-y-2 overflow-y-auto">
                {mine.map((f) => {
                  const unread = f.unreadByUser > 0;
                  return (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => {
                        setOpenThread(f.id);
                        if (unread) void markRead(f.id, f.unreadByUser);
                      }}
                      className={cn(
                        "w-full cursor-pointer space-y-1.5 rounded-xl border bg-bg p-3 text-left transition-colors hover:bg-neutral-100",
                        unread ? "border-green-200" : "border-border"
                      )}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="type-body-sb-xs text-muted">{typeLabel(f.type)}</span>
                        <span className="flex items-center gap-2">
                          {unread && <Badge variant="success">{f.unreadByUser} new</Badge>}
                          <span className="type-body-r-xs text-neutral-500">{f.replies.length} msg{f.replies.length !== 1 ? "s" : ""}</span>
                        </span>
                      </div>
                      <p className="truncate type-body-r-xs text-fg">{f.message}</p>
                      {f.replies.length > 1 && (
                        <p className="type-body-r-xs text-neutral-500">Last: {f.replies[f.replies.length - 1].message.slice(0, 50)}…</p>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
