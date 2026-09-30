import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { Sparkles } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { planTasks, type PlannedSlot } from "@/lib/ai.functions";
import { formatTime, tasksQuery, toLocalDayKey } from "@/lib/workspace";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/_authenticated/calendar")({
  head: () => ({
    meta: [
      { title: "Calendar — Meridian" },
      { name: "description", content: "See your scheduled work and let the planner fill your free time." },
      { property: "og:title", content: "Calendar — Meridian" },
      { property: "og:description", content: "Scheduled tasks and AI day planning." },
    ],
  }),
  component: CalendarPage,
});

function CalendarPage() {
  const qc = useQueryClient();
  const tasks = useQuery(tasksQuery);
  const plan = useServerFn(planTasks);
  const [day, setDay] = useState(toLocalDayKey(new Date()));
  const [slots, setSlots] = useState<PlannedSlot[]>([]);

  const scheduled = (tasks.data ?? [])
    .filter((task) => task.scheduled_start && toLocalDayKey(task.scheduled_start) === day)
    .sort((a, b) => (a.scheduled_start! < b.scheduled_start! ? -1 : 1));
  const unscheduled = (tasks.data ?? []).filter(
    (task) => task.status !== "done" && !task.scheduled_start,
  );
  const titleOf = (id: string) => (tasks.data ?? []).find((task) => task.id === id)?.title ?? "Task";

  const draft = useMutation({
    mutationFn: async () =>
      plan({
        data: {
          day,
          workingHours: "09:00-17:00",
          tasks: unscheduled.slice(0, 12).map((task) => ({
            id: task.id,
            title: task.title,
            priority: task.priority,
            due_date: task.due_date,
          })),
          busy: scheduled.map((task) => ({
            title: task.title,
            start: task.scheduled_start!,
            end: task.scheduled_end ?? task.scheduled_start!,
          })),
        },
      }),
    onSuccess: (result) => {
      setSlots(result);
      if (result.length === 0) toast.info("The planner had nothing to add.");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const apply = useMutation({
    mutationFn: async () => {
      for (const slot of slots) {
        const { error } = await supabase
          .from("tasks")
          .update({ scheduled_start: slot.start, scheduled_end: slot.end })
          .eq("id", slot.task_id);
        if (error) throw new Error(error.message);
      }
    },
    onSuccess: () => {
      toast.success("Schedule applied");
      setSlots([]);
      qc.invalidateQueries({ queryKey: ["tasks"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  return (
    <div className="space-y-6">
      <div>
        <p className="eyebrow">Calendar</p>
        <h1 className="mt-1.5 text-2xl font-bold">Your day, blocked out</h1>
      </div>

      <div className="panel flex flex-wrap items-end gap-3 p-4">
        <div className="space-y-1.5">
          <label className="eyebrow">Day</label>
          <Input type="date" value={day} onChange={(e) => setDay(e.target.value)} />
        </div>
        <Button
          className="gap-2"
          onClick={() => draft.mutate()}
          disabled={draft.isPending || unscheduled.length === 0}
        >
          <Sparkles className="size-4" />
          {draft.isPending ? "Planning…" : "Plan this day with AI"}
        </Button>
      </div>

      {slots.length > 0 ? (
        <div className="panel space-y-3 p-4">
          <h2 className="text-sm font-semibold">Proposed schedule — confirm to apply</h2>
          {slots.map((slot) => (
            <div key={slot.task_id} className="rounded-lg bg-muted px-3 py-2">
              <div className="flex items-center gap-3">
                <span className="font-mono text-xs text-muted-foreground">
                  {formatTime(slot.start)}–{formatTime(slot.end)}
                </span>
                <span className="flex-1 truncate text-sm">{titleOf(slot.task_id)}</span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">{slot.reason}</p>
            </div>
          ))}
          <div className="flex gap-2">
            <Button onClick={() => apply.mutate()} disabled={apply.isPending}>
              {apply.isPending ? "Applying…" : "Apply schedule"}
            </Button>
            <Button variant="outline" onClick={() => setSlots([])}>
              Discard
            </Button>
          </div>
        </div>
      ) : null}

      <div className="panel p-4">
        <h2 className="text-sm font-semibold">Scheduled</h2>
        <div className="mt-3 space-y-2">
          {scheduled.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nothing scheduled on this day yet.</p>
          ) : (
            scheduled.map((task) => (
              <div key={task.id} className="flex items-center gap-3 rounded-lg bg-muted px-3 py-2">
                <span className="font-mono text-xs text-muted-foreground">
                  {formatTime(task.scheduled_start!)}
                </span>
                <span className="flex-1 truncate text-sm">{task.title}</span>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="panel p-4">
        <h2 className="text-sm font-semibold">Unscheduled ({unscheduled.length})</h2>
        <div className="mt-3 space-y-2">
          {unscheduled.slice(0, 10).map((task) => (
            <p key={task.id} className="truncate rounded-lg bg-muted px-3 py-2 text-sm">
              {task.title}
            </p>
          ))}
        </div>
      </div>
    </div>
  );
}
