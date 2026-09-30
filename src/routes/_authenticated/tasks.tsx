import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { projectsQuery, tasksQuery, type Task } from "@/lib/workspace";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";

export const Route = createFileRoute("/_authenticated/tasks")({
  head: () => ({
    meta: [
      { title: "Tasks — Meridian" },
      { name: "description", content: "Every task, with its project, priority and due date in one list." },
      { property: "og:title", content: "Tasks — Meridian" },
      { property: "og:description", content: "Track tasks with project, priority and due date." },
    ],
  }),
  component: Tasks,
});

function Tasks() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const tasks = useQuery(tasksQuery);
  const projects = useQuery(projectsQuery);
  const [title, setTitle] = useState("");
  const [priority, setPriority] = useState("medium");
  const [projectId, setProjectId] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [filter, setFilter] = useState<"open" | "done" | "all">("open");

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["tasks"] });
  };

  const create = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("tasks").insert({
        user_id: user!.id,
        title,
        priority,
        project_id: projectId || null,
        due_date: dueDate || null,
      });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      setTitle("");
      setDueDate("");
      refresh();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const update = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<Task> }) => {
      const { error } = await supabase.from("tasks").update(patch).eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: refresh,
    onError: (error: Error) => toast.error(error.message),
  });

  const visible = (tasks.data ?? []).filter((task) =>
    filter === "all" ? true : filter === "done" ? task.status === "done" : task.status !== "done",
  );
  const projectName = (id: string | null) =>
    (projects.data ?? []).find((project) => project.id === id)?.name;

  return (
    <div className="space-y-6">
      <div>
        <p className="eyebrow">Tasks</p>
        <h1 className="mt-1.5 text-2xl font-bold">What needs doing</h1>
      </div>

      <form
        className="panel grid gap-3 p-4 sm:grid-cols-[2fr_1fr_1fr_auto]"
        onSubmit={(event) => {
          event.preventDefault();
          if (title.trim()) create.mutate();
        }}
      >
        <Input placeholder="New task" value={title} onChange={(e) => setTitle(e.target.value)} />
        <select
          className="h-9 rounded-md border border-input bg-background px-3 text-sm"
          value={priority}
          onChange={(e) => setPriority(e.target.value)}
        >
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
        </select>
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
        <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
        <Button type="submit" className="sm:col-span-4 sm:w-fit" disabled={!title.trim()}>
          Add task
        </Button>
      </form>

      <div className="flex gap-2">
        {(["open", "done", "all"] as const).map((key) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className={`rounded-full px-3 py-1 text-xs capitalize transition-colors ${
              filter === key ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
            }`}
          >
            {key}
          </button>
        ))}
      </div>

      <div className="space-y-2">
        {visible.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nothing here.</p>
        ) : (
          visible.map((task) => (
            <div key={task.id} className="panel flex items-center gap-3 px-3 py-2.5">
              <Checkbox
                checked={task.status === "done"}
                onCheckedChange={(checked) =>
                  update.mutate({ id: task.id, patch: { status: checked === true ? "done" : "todo" } })
                }
              />
              <span
                className={`flex-1 truncate text-sm ${task.status === "done" ? "text-muted-foreground line-through" : ""}`}
              >
                {task.title}
              </span>
              {projectName(task.project_id) ? (
                <span className="hidden rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground sm:inline">
                  {projectName(task.project_id)}
                </span>
              ) : null}
              {task.meeting_id ? (
                <span className="hidden rounded-full bg-accent-soft px-2 py-0.5 text-[11px] text-accent sm:inline">
                  from meeting
                </span>
              ) : null}
              {task.due_date ? (
                <span className="font-mono text-[10px] text-muted-foreground">{task.due_date}</span>
              ) : null}
              <span className="font-mono text-[10px] tracking-wide uppercase text-muted-foreground">
                {task.priority}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
