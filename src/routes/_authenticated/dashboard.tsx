import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";

import {
  formatTime,
  meetingsQuery,
  researchQuery,
  tasksQuery,
  toLocalDayKey,
  projectsQuery,
} from "@/lib/workspace";
import { useAuth } from "@/hooks/useAuth";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — Meridian" },
      { name: "description", content: "Today's schedule, open tasks and your latest AI meeting summaries." },
      { property: "og:title", content: "Dashboard — Meridian" },
      { property: "og:description", content: "Today's schedule, open tasks and latest meeting summaries." },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const { user } = useAuth();
  const tasks = useQuery(tasksQuery);
  const meetings = useQuery(meetingsQuery);
  const research = useQuery(researchQuery);
  const projects = useQuery(projectsQuery);

  const today = toLocalDayKey(new Date());
  const scheduled = (tasks.data ?? [])
    .filter((task) => task.scheduled_start && toLocalDayKey(task.scheduled_start) === today)
    .sort((a, b) => (a.scheduled_start! < b.scheduled_start! ? -1 : 1));
  const open = (tasks.data ?? []).filter((task) => task.status !== "done");
  const latestMeeting = (meetings.data ?? []).find((meeting) => meeting.summary);

  return (
    <div className="space-y-6">
      <div>
        <p className="eyebrow">
          {new Date().toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" })}
        </p>
        <h1 className="mt-1.5 text-2xl font-bold">
          Hello{user?.user_metadata?.["full_name"] ? `, ${user.user_metadata["full_name"]}` : ""}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {open.length} open task{open.length === 1 ? "" : "s"} · {scheduled.length} scheduled today ·{" "}
          {(projects.data ?? []).length} project{(projects.data ?? []).length === 1 ? "" : "s"}
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="panel p-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold">Today's schedule</h2>
            <Link to="/calendar" className="text-xs font-medium text-accent">
              Calendar
            </Link>
          </div>
          <div className="mt-3 space-y-2">
            {scheduled.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Nothing scheduled yet. Open the calendar and let the planner fill your day.
              </p>
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
        </section>

        <section className="panel p-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold">Open tasks</h2>
            <Link to="/tasks" className="text-xs font-medium text-accent">
              All tasks
            </Link>
          </div>
          <div className="mt-3 space-y-2">
            {open.length === 0 ? (
              <p className="text-sm text-muted-foreground">No open tasks. Enjoy the quiet.</p>
            ) : (
              open.slice(0, 6).map((task) => (
                <div key={task.id} className="flex items-center gap-3 rounded-lg bg-muted px-3 py-2">
                  <span className="flex-1 truncate text-sm">{task.title}</span>
                  <span className="font-mono text-[10px] tracking-wide uppercase text-muted-foreground">
                    {task.priority}
                  </span>
                </div>
              ))
            )}
          </div>
        </section>

        <section className="panel p-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold">Latest meeting summary</h2>
            <Link to="/meetings" className="text-xs font-medium text-accent">
              Meetings
            </Link>
          </div>
          {latestMeeting ? (
            <div className="mt-3">
              <p className="text-sm font-medium">{latestMeeting.title}</p>
              <p className="mt-1.5 text-sm text-pretty text-muted-foreground">{latestMeeting.summary}</p>
            </div>
          ) : (
            <p className="mt-3 text-sm text-muted-foreground">
              Paste your first set of meeting notes and Meridian will draft a summary.
            </p>
          )}
        </section>

        <section className="panel p-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold">Recent research</h2>
            <Link to="/research" className="text-xs font-medium text-accent">
              Research
            </Link>
          </div>
          <div className="mt-3 space-y-2">
            {(research.data ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Ask a work question and save the findings against a project.
              </p>
            ) : (
              (research.data ?? []).slice(0, 4).map((note) => (
                <p key={note.id} className="truncate rounded-lg bg-muted px-3 py-2 text-sm">
                  {note.question}
                </p>
              ))
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
