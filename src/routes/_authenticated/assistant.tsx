import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { SendHorizonal } from "lucide-react";

import { askAssistant } from "@/lib/ai.functions";
import { chatQuery, meetingsQuery, projectsQuery, tasksQuery } from "@/lib/workspace";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export const Route = createFileRoute("/_authenticated/assistant")({
  head: () => ({
    meta: [
      { title: "AI Assistant — Meridian" },
      { name: "description", content: "Ask the assistant about your meetings, tasks, schedule and research." },
      { property: "og:title", content: "AI Assistant — Meridian" },
      { property: "og:description", content: "Chat with an assistant that knows your workspace." },
    ],
  }),
  component: Assistant,
});

function Assistant() {
  const qc = useQueryClient();
  const chat = useQuery(chatQuery);
  const tasks = useQuery(tasksQuery);
  const meetings = useQuery(meetingsQuery);
  const projects = useQuery(projectsQuery);
  const send = useServerFn(askAssistant);
  const [input, setInput] = useState("");
  const boxRef = useRef<HTMLTextAreaElement>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    boxRef.current?.focus();
  }, []);
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chat.data]);

  const ask = useMutation({
    mutationFn: async (message: string) => {
      const workspace = JSON.stringify({
        projects: (projects.data ?? []).map((p) => ({ name: p.name, description: p.description })),
        open_tasks: (tasks.data ?? [])
          .filter((t) => t.status !== "done")
          .slice(0, 30)
          .map((t) => ({ title: t.title, priority: t.priority, due: t.due_date, scheduled: t.scheduled_start })),
        recent_meetings: (meetings.data ?? [])
          .slice(0, 5)
          .map((m) => ({ title: m.title, summary: m.summary })),
      });
      return send({
        data: {
          message,
          workspace,
          history: (chat.data ?? []).slice(-20).map((m) => ({
            role: m.role === "assistant" ? ("assistant" as const) : ("user" as const),
            content: m.content,
          })),
        },
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["chat"] });
      boxRef.current?.focus();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  function submit() {
    const message = input.trim();
    if (!message || ask.isPending) return;
    setInput("");
    ask.mutate(message);
  }

  return (
    <div className="flex h-[calc(100vh-8rem)] flex-col space-y-4">
      <div>
        <p className="eyebrow">Assistant</p>
        <h1 className="mt-1.5 text-2xl font-bold">Ask Meridian</h1>
      </div>

      <div className="panel flex-1 space-y-3 overflow-y-auto p-4">
        {(chat.data ?? []).length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Ask about your open tasks, a meeting summary, or what to focus on next.
          </p>
        ) : (
          (chat.data ?? []).map((message) => (
            <div
              key={message.id}
              className={message.role === "user" ? "flex justify-end" : "flex justify-start"}
            >
              <div
                className={`max-w-[85%] rounded-2xl px-3.5 py-2 text-sm whitespace-pre-wrap ${
                  message.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-foreground"
                }`}
              >
                {message.content}
              </div>
            </div>
          ))
        )}
        {ask.isPending ? <p className="eyebrow">Thinking…</p> : null}
        <div ref={endRef} />
      </div>

      <div className="panel flex items-end gap-2 p-2">
        <Textarea
          ref={boxRef}
          rows={2}
          placeholder="Message Meridian…"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              submit();
            }
          }}
          className="resize-none border-0 shadow-none focus-visible:ring-0"
        />
        <Button size="icon" onClick={submit} disabled={ask.isPending || !input.trim()}>
          <SendHorizonal className="size-4" />
        </Button>
      </div>
    </div>
  );
}
