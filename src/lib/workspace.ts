import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type Project = Database["public"]["Tables"]["projects"]["Row"];
export type Meeting = Database["public"]["Tables"]["meetings"]["Row"];
export type Task = Database["public"]["Tables"]["tasks"]["Row"];
export type ResearchNote = Database["public"]["Tables"]["research_notes"]["Row"];
export type ChatMessage = Database["public"]["Tables"]["chat_messages"]["Row"];

function unwrap<T>(result: { data: T | null; error: { message: string } | null }): T {
  if (result.error) throw new Error(result.error.message);
  return (result.data ?? []) as T;
}

export const projectsQuery = {
  queryKey: ["projects"],
  queryFn: async () =>
    unwrap<Project[]>(
      await supabase.from("projects").select("*").order("created_at", { ascending: false }),
    ),
};

export const meetingsQuery = {
  queryKey: ["meetings"],
  queryFn: async () =>
    unwrap<Meeting[]>(
      await supabase.from("meetings").select("*").order("meeting_date", { ascending: false }),
    ),
};

export const tasksQuery = {
  queryKey: ["tasks"],
  queryFn: async () =>
    unwrap<Task[]>(
      await supabase.from("tasks").select("*").order("created_at", { ascending: false }),
    ),
};

export const researchQuery = {
  queryKey: ["research"],
  queryFn: async () =>
    unwrap<ResearchNote[]>(
      await supabase.from("research_notes").select("*").order("created_at", { ascending: false }),
    ),
};

export const chatQuery = {
  queryKey: ["chat"],
  queryFn: async () =>
    unwrap<ChatMessage[]>(
      await supabase.from("chat_messages").select("*").order("created_at", { ascending: true }),
    ),
};

export const priorityLabels: Record<string, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
};

export function formatDay(value: string | Date) {
  const date = typeof value === "string" ? new Date(value) : value;
  return date.toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" });
}

export function formatTime(value: string) {
  return new Date(value).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
}

export function toLocalDayKey(value: string | Date) {
  const date = typeof value === "string" ? new Date(value) : value;
  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60000).toISOString().slice(0, 10);
}
