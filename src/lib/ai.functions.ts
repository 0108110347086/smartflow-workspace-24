import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type ActionItemDraft = {
  title: string;
  priority: "low" | "medium" | "high";
  due_date: string | null;
};

export type MeetingSummaryDraft = {
  summary: string;
  decisions: string;
  action_items: ActionItemDraft[];
};

export const summarizeMeeting = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z.object({ title: z.string().min(1), notes: z.string().min(10) }).parse(data),
  )
  .handler(async ({ data }): Promise<MeetingSummaryDraft> => {
    const { runAi, parseJsonReply } = await import("./ai.server");
    const today = new Date().toISOString().slice(0, 10);
    const text = await runAi(
      `You summarize meeting notes for a productivity workspace. Today is ${today}.
Reply with JSON only, shaped as:
{"summary": "3-5 sentence recap", "decisions": "short bullet list as plain text", "action_items": [{"title": "...", "priority": "low|medium|high", "due_date": "YYYY-MM-DD or null"}]}
Only include action items that were genuinely committed to. Never invent attendees or facts.`,
      [{ role: "user", content: `Meeting title: ${data.title}\n\nNotes:\n${data.notes}` }],
    );
    const draft = parseJsonReply<MeetingSummaryDraft>(text, {
      summary: text.trim(),
      decisions: "",
      action_items: [],
    });
    return {
      summary: draft.summary ?? "",
      decisions: draft.decisions ?? "",
      action_items: (draft.action_items ?? []).slice(0, 15).map((item) => ({
        title: String(item.title ?? "").slice(0, 200),
        priority: (["low", "medium", "high"] as const).includes(item.priority) ? item.priority : "medium",
        due_date: item.due_date && /^\d{4}-\d{2}-\d{2}$/.test(item.due_date) ? item.due_date : null,
      })),
    };
  });

export type PlannedSlot = { task_id: string; start: string; end: string; reason: string };

export const planTasks = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z
      .object({
        day: z.string(),
        workingHours: z.string().default("09:00-17:00"),
        tasks: z
          .array(
            z.object({
              id: z.string(),
              title: z.string(),
              priority: z.string(),
              due_date: z.string().nullable().optional(),
            }),
          )
          .min(1),
        busy: z.array(z.object({ title: z.string(), start: z.string(), end: z.string() })).default([]),
      })
      .parse(data),
  )
  .handler(async ({ data }): Promise<PlannedSlot[]> => {
    const { runAi, parseJsonReply } = await import("./ai.server");
    const text = await runAi(
      `You are a scheduling planner. Fit the given tasks into free time on the given day, respecting working hours and existing busy blocks.
Use 25-90 minute blocks, leave short gaps, and schedule higher-priority and sooner-due tasks first. Do not schedule a task twice.
Reply with JSON only: {"slots": [{"task_id": "...", "start": "ISO 8601 datetime", "end": "ISO 8601 datetime", "reason": "one short sentence"}]}`,
      [
        {
          role: "user",
          content: JSON.stringify({
            day: data.day,
            working_hours: data.workingHours,
            timezone_note: "All datetimes are local wall-clock for that day.",
            busy: data.busy,
            tasks: data.tasks,
          }),
        },
      ],
    );
    const parsed = parseJsonReply<{ slots: PlannedSlot[] }>(text, { slots: [] });
    return (parsed.slots ?? []).filter((slot) => slot.task_id && slot.start && slot.end);
  });

export const runResearch = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z.object({ question: z.string().min(3), context: z.string().optional().default("") }).parse(data),
  )
  .handler(async ({ data }): Promise<string> => {
    const { runAi } = await import("./ai.server");
    return runAi(
      `You are a research assistant inside a work productivity app. Answer with structured markdown:
a short answer, then "Key points" as bullets, then "Open questions" as bullets.
Be concrete and honest about uncertainty. Never fabricate sources, statistics or quotes; if you are unsure, say so.`,
      [
        {
          role: "user",
          content: data.context
            ? `Question: ${data.question}\n\nRelated work context:\n${data.context}`
            : `Question: ${data.question}`,
        },
      ],
    );
  });

export const askAssistant = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z
      .object({
        message: z.string().min(1),
        history: z
          .array(z.object({ role: z.enum(["user", "assistant"]), content: z.string() }))
          .default([]),
        workspace: z.string().default(""),
      })
      .parse(data),
  )
  .handler(async ({ data, context }): Promise<string> => {
    const { runAi } = await import("./ai.server");
    const reply = await runAi(
      `You are the assistant inside a personal productivity workspace. You can see a snapshot of the user's meetings, tasks, projects and research below.
Answer in short, practical markdown. When the user asks you to change something, explain exactly what you would do and ask them to confirm — you cannot write to their data yourself.

Workspace snapshot:
${data.workspace || "(empty workspace)"}`,
      [
        ...data.history.slice(-20).map((m) => ({ role: m.role, content: m.content }) as const),
        { role: "user" as const, content: data.message },
      ],
    );

    await context.supabase.from("chat_messages").insert([
      { user_id: context.userId, role: "user", content: data.message },
      { user_id: context.userId, role: "assistant", content: reply },
    ]);

    return reply;
  });
