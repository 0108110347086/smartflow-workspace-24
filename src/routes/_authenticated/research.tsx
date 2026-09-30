import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { Sparkles } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { runResearch } from "@/lib/ai.functions";
import { projectsQuery, researchQuery, tasksQuery } from "@/lib/workspace";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export const Route = createFileRoute("/_authenticated/research")({
  head: () => ({
    meta: [
      { title: "Research — Meridian" },
      { name: "description", content: "Ask a work question, save the findings and link them to a project or task." },
      { property: "og:title", content: "Research — Meridian" },
      { property: "og:description", content: "AI research findings linked to your projects and tasks." },
    ],
  }),
  component: Research,
});

function Research() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const notes = useQuery(researchQuery);
  const projects = useQuery(projectsQuery);
  const tasks = useQuery(tasksQuery);
  const ask = useServerFn(runResearch);

  const [question, setQuestion] = useState("");
  const [projectId, setProjectId] = useState("");
  const [taskId, setTaskId] = useState("");
  const [findings, setFindings] = useState("");

  const research = useMutation({
    mutationFn: async () => {
      const project = (projects.data ?? []).find((p) => p.id === projectId);
      const task = (tasks.data ?? []).find((t) => t.id === taskId);
      const context = [
        project ? `Project: ${project.name}. ${project.description ?? ""}` : "",
        task ? `Related task: ${task.title}` : "",
      ]
        .filter(Boolean)
        .join("\n");
      return ask({ data: { question, context } });
    },
    onSuccess: (result) => setFindings(result),
    onError: (error: Error) => toast.error(error.message),
  });

  const save = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("research_notes").insert({
        user_id: user!.id,
        project_id: projectId || null,
        task_id: taskId || null,
        question,
        findings,
      });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      toast.success("Findings saved");
      setQuestion("");
      setFindings("");
      qc.invalidateQueries({ queryKey: ["research"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  return (
    <div className="space-y-6">
      <div>
        <p className="eyebrow">Research</p>
        <h1 className="mt-1.5 text-2xl font-bold">Ask, then keep what matters</h1>
      </div>

      <div className="panel space-y-3 p-4">
        <Input
          placeholder="What do you need to find out?"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
        />
        <div className="grid gap-3 sm:grid-cols-2">
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
          <select
            className="h-9 rounded-md border border-input bg-background px-3 text-sm"
            value={taskId}
            onChange={(e) => setTaskId(e.target.value)}
          >
            <option value="">No task</option>
            {(tasks.data ?? [])
              .filter((task) => task.status !== "done")
              .map((task) => (
                <option key={task.id} value={task.id}>
                  {task.title}
                </option>
              ))}
          </select>
        </div>
        <Button
          className="gap-2"
          onClick={() => research.mutate()}
          disabled={research.isPending || question.trim().length < 3}
        >
          <Sparkles className="size-4" />
          {research.isPending ? "Researching…" : "Research with AI"}
        </Button>
      </div>

      {findings ? (
        <div className="panel space-y-3 p-4">
          <h2 className="text-sm font-semibold">Findings — edit before saving</h2>
          <Textarea rows={12} value={findings} onChange={(e) => setFindings(e.target.value)} />
          <div className="flex gap-2">
            <Button onClick={() => save.mutate()} disabled={save.isPending}>
              {save.isPending ? "Saving…" : "Save findings"}
            </Button>
            <Button variant="outline" onClick={() => setFindings("")}>
              Discard
            </Button>
          </div>
        </div>
      ) : null}

      <div className="space-y-3">
        <h2 className="text-sm font-semibold">Saved research</h2>
        {(notes.data ?? []).length === 0 ? (
          <p className="text-sm text-muted-foreground">Nothing saved yet.</p>
        ) : (
          (notes.data ?? []).map((note) => (
            <div key={note.id} className="panel p-4">
              <h3 className="text-sm font-semibold">{note.question}</h3>
              <p className="mt-2 text-sm whitespace-pre-wrap text-muted-foreground">{note.findings}</p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
