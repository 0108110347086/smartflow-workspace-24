import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { Sparkles } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { summarizeMeeting, type ActionItemDraft } from "@/lib/ai.functions";
import { formatDay, meetingsQuery, projectsQuery } from "@/lib/workspace";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";

export const Route = createFileRoute("/_authenticated/meetings")({
  head: () => ({
    meta: [
      { title: "Meetings — Meridian" },
      { name: "description", content: "Paste meeting notes and get a summary with action items you can approve as tasks." },
      { property: "og:title", content: "Meetings — Meridian" },
      { property: "og:description", content: "Meeting notes in, summary and action items out." },
    ],
  }),
  component: Meetings,
});

type DraftItem = ActionItemDraft & { accepted: boolean };

function Meetings() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const meetings = useQuery(meetingsQuery);
  const projects = useQuery(projectsQuery);
  const summarize = useServerFn(summarizeMeeting);

  const [title, setTitle] = useState("");
  const [projectId, setProjectId] = useState("");
  const [notes, setNotes] = useState("");
  const [summary, setSummary] = useState("");
  const [decisions, setDecisions] = useState("");
  const [items, setItems] = useState<DraftItem[]>([]);
  const [hasDraft, setHasDraft] = useState(false);

  const draft = useMutation({
    mutationFn: async () => summarize({ data: { title: title || "Untitled meeting", notes } }),
    onSuccess: (result) => {
      setSummary(result.summary);
      setDecisions(result.decisions);
      setItems(result.action_items.map((item) => ({ ...item, accepted: true })));
      setHasDraft(true);
      toast.success("Draft ready — review it before saving");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const save = useMutation({
    mutationFn: async () => {
      const accepted = items.filter((item) => item.accepted);
      const { data: meeting, error } = await supabase
        .from("meetings")
        .insert({
          user_id: user!.id,
          project_id: projectId || null,
          title: title || "Untitled meeting",
          raw_notes: notes,
          summary,
          decisions,
          action_items: accepted.map(({ title: t, priority, due_date }) => ({ title: t, priority, due_date })),
        })
        .select()
        .single();
      if (error) throw new Error(error.message);

      if (accepted.length > 0) {
        const { error: taskError } = await supabase.from("tasks").insert(
          accepted.map((item) => ({
            user_id: user!.id,
            project_id: projectId || null,
            meeting_id: meeting.id,
            title: item.title,
            priority: item.priority,
            due_date: item.due_date,
          })),
        );
        if (taskError) throw new Error(taskError.message);
      }
      return accepted.length;
    },
    onSuccess: (count) => {
      toast.success(`Meeting saved · ${count} task${count === 1 ? "" : "s"} created`);
      setTitle("");
      setNotes("");
      setSummary("");
      setDecisions("");
      setItems([]);
      setHasDraft(false);
      qc.invalidateQueries({ queryKey: ["meetings"] });
      qc.invalidateQueries({ queryKey: ["tasks"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  return (
    <div className="space-y-6">
      <div>
        <p className="eyebrow">Meetings</p>
        <h1 className="mt-1.5 text-2xl font-bold">Notes in, action items out</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Nothing is saved until you review the draft and confirm.
        </p>
      </div>

      <div className="panel space-y-3 p-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <Input placeholder="Meeting title" value={title} onChange={(e) => setTitle(e.target.value)} />
          <select
            className="h-9 rounded-md border border-input bg-background px-3 text-sm"
            value={projectId}
            onChange={(e) => setProjectId(e.target.value)}
          >
            <option value="">No project</option>
            {(projects.data ?? []).map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </select>
        </div>
        <Textarea
          rows={8}
          placeholder="Paste your raw meeting notes or transcript here…"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
        <Button
          onClick={() => draft.mutate()}
          disabled={draft.isPending || notes.trim().length < 10}
          className="gap-2"
        >
          <Sparkles className="size-4" />
          {draft.isPending ? "Summarizing…" : "Summarize with AI"}
        </Button>
      </div>

      {hasDraft ? (
        <div className="panel space-y-4 p-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold">Review the draft</h2>
            <span className="rounded-full bg-accent-soft px-2 py-0.5 font-mono text-[10px] tracking-wide uppercase text-accent">
              Draft
            </span>
          </div>

          <div className="space-y-1.5">
            <label className="eyebrow">Summary</label>
            <Textarea rows={4} value={summary} onChange={(e) => setSummary(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <label className="eyebrow">Decisions</label>
            <Textarea rows={3} value={decisions} onChange={(e) => setDecisions(e.target.value)} />
          </div>

          <div className="space-y-2">
            <label className="eyebrow">Action items → tasks</label>
            {items.length === 0 ? (
              <p className="text-sm text-muted-foreground">No action items were found in these notes.</p>
            ) : (
              items.map((item, index) => (
                <div key={index} className="flex items-center gap-2.5 rounded-lg bg-muted px-3 py-2">
                  <Checkbox
                    checked={item.accepted}
                    onCheckedChange={(checked) =>
                      setItems((current) =>
                        current.map((it, i) => (i === index ? { ...it, accepted: checked === true } : it)),
                      )
                    }
                  />
                  <input
                    className="flex-1 bg-transparent text-sm outline-none"
                    value={item.title}
                    onChange={(e) =>
                      setItems((current) =>
                        current.map((it, i) => (i === index ? { ...it, title: e.target.value } : it)),
                      )
                    }
                  />
                  <span className="font-mono text-[10px] text-muted-foreground">
                    {item.due_date ?? "no date"}
                  </span>
                </div>
              ))
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            <Button onClick={() => save.mutate()} disabled={save.isPending}>
              {save.isPending
                ? "Saving…"
                : `Save meeting & create ${items.filter((i) => i.accepted).length} task(s)`}
            </Button>
            <Button variant="outline" onClick={() => setHasDraft(false)}>
              Discard draft
            </Button>
          </div>
        </div>
      ) : null}

      <div className="space-y-3">
        <h2 className="text-sm font-semibold">Past meetings</h2>
        {(meetings.data ?? []).length === 0 ? (
          <p className="text-sm text-muted-foreground">No meetings saved yet.</p>
        ) : (
          (meetings.data ?? []).map((meeting) => (
            <div key={meeting.id} className="panel p-4">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-base font-semibold">{meeting.title}</h3>
                <span className="font-mono text-[10px] text-muted-foreground">
                  {formatDay(meeting.meeting_date)}
                </span>
              </div>
              {meeting.summary ? (
                <p className="mt-2 text-sm text-pretty text-muted-foreground">{meeting.summary}</p>
              ) : null}
              {Array.isArray(meeting.action_items) && meeting.action_items.length > 0 ? (
                <ul className="mt-3 space-y-1">
                  {(meeting.action_items as { title: string }[]).map((item, index) => (
                    <li key={index} className="rounded-lg bg-muted px-3 py-1.5 text-sm">
                      {item.title}
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
