import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { meetingsQuery, projectsQuery, researchQuery, tasksQuery } from "@/lib/workspace";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export const Route = createFileRoute("/_authenticated/projects")({
  head: () => ({
    meta: [
      { title: "Projects — Meridian" },
      { name: "description", content: "Group tasks, meetings and research under the project they belong to." },
      { property: "og:title", content: "Projects — Meridian" },
      { property: "og:description", content: "Group tasks, meetings and research by project." },
    ],
  }),
  component: Projects,
});

function Projects() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const projects = useQuery(projectsQuery);
  const tasks = useQuery(tasksQuery);
  const meetings = useQuery(meetingsQuery);
  const research = useQuery(researchQuery);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  const create = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("projects")
        .insert({ user_id: user!.id, name, description });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      setName("");
      setDescription("");
      toast.success("Project created");
      qc.invalidateQueries({ queryKey: ["projects"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  return (
    <div className="space-y-6">
      <div>
        <p className="eyebrow">Projects</p>
        <h1 className="mt-1.5 text-2xl font-bold">Everything, grouped by the work it serves</h1>
      </div>

      <form
        className="panel space-y-3 p-4"
        onSubmit={(event) => {
          event.preventDefault();
          if (name.trim()) create.mutate();
        }}
      >
        <Input placeholder="Project name" value={name} onChange={(e) => setName(e.target.value)} />
        <Textarea
          placeholder="What is this project about?"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
        />
        <Button type="submit" disabled={create.isPending || !name.trim()}>
          {create.isPending ? "Creating…" : "Create project"}
        </Button>
      </form>

      <div className="grid gap-3 sm:grid-cols-2">
        {(projects.data ?? []).map((project) => {
          const projectTasks = (tasks.data ?? []).filter((t) => t.project_id === project.id);
          return (
            <div key={project.id} className="panel p-4">
              <h2 className="text-base font-semibold">{project.name}</h2>
              {project.description ? (
                <p className="mt-1 text-sm text-pretty text-muted-foreground">{project.description}</p>
              ) : null}
              <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
                <span className="rounded-full bg-muted px-2.5 py-1">
                  {projectTasks.filter((t) => t.status !== "done").length} open tasks
                </span>
                <span className="rounded-full bg-muted px-2.5 py-1">
                  {(meetings.data ?? []).filter((m) => m.project_id === project.id).length} meetings
                </span>
                <span className="rounded-full bg-muted px-2.5 py-1">
                  {(research.data ?? []).filter((r) => r.project_id === project.id).length} research notes
                </span>
              </div>
              {projectTasks.length > 0 ? (
                <ul className="mt-3 space-y-1.5">
                  {projectTasks.slice(0, 4).map((task) => (
                    <li key={task.id} className="truncate rounded-lg bg-muted px-3 py-1.5 text-sm">
                      {task.title}
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          );
        })}
        {(projects.data ?? []).length === 0 ? (
          <p className="text-sm text-muted-foreground">No projects yet — create your first one above.</p>
        ) : null}
      </div>
    </div>
  );
}
