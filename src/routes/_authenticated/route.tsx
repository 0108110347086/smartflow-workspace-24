import { createFileRoute, Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  CalendarDays,
  CheckSquare,
  FolderKanban,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageSquare,
  Mic,
  Moon,
  Search,
  Settings,
  Sun,
} from "lucide-react";

import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "@/hooks/useTheme";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated")({
  component: WorkspaceLayout,
});

const NAV = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/meetings", label: "Meetings", icon: Mic },
  { to: "/tasks", label: "Tasks", icon: CheckSquare },
  { to: "/calendar", label: "Calendar", icon: CalendarDays },
  { to: "/research", label: "Research", icon: Search },
  { to: "/projects", label: "Projects", icon: FolderKanban },
  { to: "/assistant", label: "Assistant", icon: MessageSquare },
  { to: "/settings", label: "Settings", icon: Settings },
] as const;

function WorkspaceLayout() {
  const { user, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { theme, toggle } = useTheme();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth" });
  }, [loading, user, navigate]);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="eyebrow">Loading workspace…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background lg:flex">
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 w-64 shrink-0 border-r border-sidebar-border bg-sidebar px-3 py-4 transition-transform lg:static lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex items-center gap-2 px-2">
          <div className="grid size-7 place-items-center rounded-lg bg-primary font-mono text-xs text-primary-foreground">
            m
          </div>
          <span className="font-display text-base font-semibold">meridian</span>
        </div>

        <nav className="mt-6 space-y-1">
          {NAV.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm text-sidebar-foreground/75 transition-colors hover:bg-sidebar-accent"
              activeProps={{
                className:
                  "flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm bg-sidebar-accent font-medium text-sidebar-accent-foreground",
              }}
            >
              <item.icon className="size-4" />
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="absolute inset-x-3 bottom-4 space-y-2">
          <div className="truncate rounded-lg bg-sidebar-accent px-2.5 py-2 text-xs text-muted-foreground">
            {user.email}
          </div>
          <div className="flex gap-2">
            <button
              onClick={toggle}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-sidebar-border px-2 py-2 text-xs transition-colors hover:bg-sidebar-accent"
            >
              {theme === "dark" ? <Sun className="size-3.5" /> : <Moon className="size-3.5" />}
              {theme === "dark" ? "Light" : "Dark"}
            </button>
            <button
              onClick={async () => {
                await signOut();
                navigate({ to: "/" });
              }}
              className="flex items-center justify-center gap-1.5 rounded-lg border border-sidebar-border px-3 py-2 text-xs transition-colors hover:bg-sidebar-accent"
            >
              <LogOut className="size-3.5" />
            </button>
          </div>
        </div>
      </aside>

      {open ? (
        <button
          aria-label="Close menu"
          className="fixed inset-0 z-30 bg-foreground/30 lg:hidden"
          onClick={() => setOpen(false)}
        />
      ) : null}

      <div className="min-w-0 flex-1">
        <header className="flex items-center gap-3 border-b border-border px-4 py-3 lg:hidden">
          <button onClick={() => setOpen(true)} aria-label="Open menu">
            <Menu className="size-5" />
          </button>
          <span className="font-display text-sm font-semibold">meridian</span>
        </header>
        <main className="mx-auto w-full max-w-6xl px-4 py-6 lg:px-8 lg:py-10">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
