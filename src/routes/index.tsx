import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, CalendarDays, CheckSquare, Mic, Search } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Meridian — turn meetings into a scheduled plan" },
      {
        name: "description",
        content:
          "Meridian summarizes meeting notes, turns action items into tasks, schedules them on your calendar and keeps research linked to every project.",
      },
      { property: "og:title", content: "Meridian — turn meetings into a scheduled plan" },
      {
        property: "og:description",
        content:
          "One AI workspace for meeting summaries, tasks, scheduling, research and projects.",
      },
    ],
  }),
  component: Landing,
});

const CHAIN = [
  {
    icon: Mic,
    title: "Meetings",
    body: "Paste raw notes. Meridian drafts a summary, the decisions and the action items.",
  },
  {
    icon: CheckSquare,
    title: "Tasks",
    body: "Approve action items and they become tasks with a priority, due date and project.",
  },
  {
    icon: CalendarDays,
    title: "Calendar",
    body: "Ask for a plan and your open tasks are placed into the free time in your day.",
  },
  {
    icon: Search,
    title: "Research",
    body: "Ask a question, save the findings, and keep them attached to the task they unblock.",
  },
];

function Landing() {
  return (
    <div className="min-h-screen bg-background">
      <header className="mx-auto flex max-w-5xl items-center justify-between px-5 py-5">
        <div className="flex items-center gap-2">
          <div className="grid size-7 place-items-center rounded-lg bg-primary font-mono text-xs text-primary-foreground">
            m
          </div>
          <span className="font-display text-base font-semibold">meridian</span>
        </div>
        <Link
          to="/auth"
          className="rounded-lg bg-primary px-3.5 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
        >
          Sign in
        </Link>
      </header>

      <section className="mx-auto max-w-5xl px-5 pt-10 pb-16">
        <p className="eyebrow">AI productivity workspace</p>
        <h1 className="mt-3 max-w-2xl text-4xl leading-[1.05] font-bold text-balance sm:text-5xl">
          Your meetings, tasks, schedule and research — finally in one chain.
        </h1>
        <p className="mt-4 max-w-xl text-base text-pretty text-muted-foreground">
          Meridian reads your meeting notes, drafts the action items, schedules them into your week
          and keeps every piece of research tied to the project it belongs to.
        </p>
        <div className="mt-7 flex flex-wrap items-center gap-3">
          <Link
            to="/auth"
            className="inline-flex items-center gap-2 rounded-xl bg-accent px-4 py-2.5 text-sm font-medium text-accent-foreground transition-opacity hover:opacity-90"
          >
            Start your workspace <ArrowRight className="size-4" />
          </Link>
          <span className="text-sm text-muted-foreground">Free to try · Nothing to install</span>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-5 pb-20">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {CHAIN.map((item, index) => (
            <div key={item.title} className="panel p-4">
              <div className="flex items-center justify-between">
                <item.icon className="size-4 text-accent" />
                <span className="font-mono text-[10px] text-muted-foreground">0{index + 1}</span>
              </div>
              <h2 className="mt-3 text-base font-semibold">{item.title}</h2>
              <p className="mt-1.5 text-sm text-pretty text-muted-foreground">{item.body}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="border-t border-border">
        <div className="mx-auto max-w-5xl px-5 py-6 text-sm text-muted-foreground">
          Meridian — one calm workspace for focused work.
        </div>
      </footer>
    </div>
  );
}
