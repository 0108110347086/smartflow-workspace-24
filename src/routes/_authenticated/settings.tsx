import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "@/hooks/useTheme";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({
    meta: [
      { title: "Settings — Meridian" },
      { name: "description", content: "Update your name, switch appearance and manage your account." },
      { property: "og:title", content: "Settings — Meridian" },
      { property: "og:description", content: "Profile and appearance settings." },
    ],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  const { user, signOut } = useAuth();
  const { theme, toggle } = useTheme();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [fullName, setFullName] = useState("");

  const profile = useQuery({
    queryKey: ["profile"],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("*").maybeSingle();
      if (error) throw new Error(error.message);
      return data;
    },
  });

  useEffect(() => {
    if (profile.data?.full_name) setFullName(profile.data.full_name);
  }, [profile.data]);

  const save = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("profiles")
        .upsert({ id: user!.id, full_name: fullName });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      toast.success("Profile saved");
      qc.invalidateQueries({ queryKey: ["profile"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  return (
    <div className="max-w-xl space-y-6">
      <div>
        <p className="eyebrow">Settings</p>
        <h1 className="mt-1.5 text-2xl font-bold">Your account</h1>
      </div>

      <div className="panel space-y-3 p-4">
        <div className="space-y-1.5">
          <Label htmlFor="email">Email</Label>
          <Input id="email" value={user?.email ?? ""} disabled />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="name">Display name</Label>
          <Input id="name" value={fullName} onChange={(e) => setFullName(e.target.value)} />
        </div>
        <Button onClick={() => save.mutate()} disabled={save.isPending}>
          {save.isPending ? "Saving…" : "Save profile"}
        </Button>
      </div>

      <div className="panel flex items-center justify-between p-4">
        <div>
          <p className="text-sm font-medium">Appearance</p>
          <p className="text-sm text-muted-foreground">Currently {theme} mode.</p>
        </div>
        <Button variant="outline" onClick={toggle}>
          Switch to {theme === "dark" ? "light" : "dark"}
        </Button>
      </div>

      <div className="panel flex items-center justify-between p-4">
        <div>
          <p className="text-sm font-medium">Session</p>
          <p className="text-sm text-muted-foreground">Your workspace data stays private to you.</p>
        </div>
        <Button
          variant="outline"
          onClick={async () => {
            await signOut();
            navigate({ to: "/" });
          }}
        >
          Sign out
        </Button>
      </div>
    </div>
  );
}
