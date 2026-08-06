import { createFileRoute } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Plug, Check, Settings2, Trash2 } from "lucide-react";

import { AppShell } from "@/components/karacter/AppShell";
import { AuthGate } from "@/components/karacter/AuthGate";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useCapabilities, useIntegrations } from "@/lib/karacter/registry";
import type { Capability, Integration } from "@/lib/karacter/types";

export const Route = createFileRoute("/integrations")({
  head: () => ({
    meta: [
      { title: "Integrations — Karacter AI Capability Registry" },
      {
        name: "description",
        content:
          "Install, configure, enable or revoke Karacter AI capabilities at runtime — no redeploy required.",
      },
      { property: "og:title", content: "Integrations — Karacter AI Capability Registry" },
      {
        property: "og:description",
        content: "Connect Calendar, GitHub, Docker, OBS, Terminal, Spotify and more at runtime.",
      },
    ],
  }),
  component: () => (
    <AuthGate>
      <AppShell>
        <Integrations />
      </AppShell>
    </AuthGate>
  ),
});

function Integrations() {
  const queryClient = useQueryClient();
  const { data: capabilities = [], isLoading } = useCapabilities();
  const { data: integrations = [] } = useIntegrations();
  const [configuring, setConfiguring] = useState<Capability | null>(null);
  const [draft, setDraft] = useState<Record<string, string>>({});

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["integrations"] });
  const find = (id: string): Integration | undefined =>
    integrations.find((i) => i.capability_id === id);

  async function connect(capability: Capability) {
    const { error } = await supabase
      .from("integrations")
      .insert({ capability_id: capability.id, status: "connected", enabled: true });
    if (error) return toast.error(error.message);
    toast.success(`${capability.name} connected`);
    refresh();
    if ((capability.config_schema ?? []).length > 0) openConfig(capability);
  }

  async function toggle(integration: Integration, enabled: boolean) {
    const { error } = await supabase.from("integrations").update({ enabled }).eq("id", integration.id);
    if (error) return toast.error(error.message);
    refresh();
  }

  async function revoke(integration: Integration) {
    const { error } = await supabase.from("integrations").delete().eq("id", integration.id);
    if (error) return toast.error(error.message);
    toast.success("Integration revoked");
    refresh();
  }

  function openConfig(capability: Capability) {
    const existing = find(capability.id);
    setDraft(
      Object.fromEntries(
        (capability.config_schema ?? []).map((field) => [
          field.key,
          String((existing?.config as Record<string, unknown>)?.[field.key] ?? ""),
        ]),
      ),
    );
    setConfiguring(capability);
  }

  async function saveConfig() {
    if (!configuring) return;
    const integration = find(configuring.id);
    if (!integration) return;
    const { error } = await supabase
      .from("integrations")
      .update({ config: draft, status: "connected" })
      .eq("id", integration.id);
    if (error) return toast.error(error.message);
    toast.success("Settings saved");
    setConfiguring(null);
    refresh();
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Integrations</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Karacter discovers what it can do from this registry at runtime. Connect, configure or
          revoke a capability at any time — nothing is compiled in.
        </p>
      </header>

      {isLoading && <p className="text-sm text-muted-foreground">Loading registry…</p>}

      <div className="grid gap-3 sm:grid-cols-2">
        {capabilities.map((capability) => {
          const integration = find(capability.id);
          return (
            <div key={capability.id} className="rounded-2xl border border-border bg-card p-4">
              <div className="flex items-start gap-3">
                <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-secondary text-primary">
                  <Plug className="size-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h2 className="truncate text-sm font-semibold">{capability.name}</h2>
                    <Badge variant="secondary" className="text-[10px]">
                      {capability.auth_type.replace("_", " ")}
                    </Badge>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">{capability.description}</p>
                  <p className="mt-2 font-mono text-[10px] text-muted-foreground">
                    {(capability.actions ?? []).map((a) => a.name).join(" · ")}
                  </p>
                </div>
              </div>

              <div className="mt-4 flex items-center gap-2">
                {integration ? (
                  <>
                    <Switch
                      checked={integration.enabled}
                      onCheckedChange={(value) => toggle(integration, value)}
                      aria-label={`Enable ${capability.name}`}
                    />
                    <span className="text-xs text-muted-foreground">
                      {integration.enabled ? "Enabled" : "Disabled"}
                    </span>
                    <div className="ml-auto flex gap-1">
                      {(capability.config_schema ?? []).length > 0 && (
                        <Button size="sm" variant="ghost" onClick={() => openConfig(capability)}>
                          <Settings2 className="size-3.5" />
                        </Button>
                      )}
                      <Button size="sm" variant="ghost" onClick={() => revoke(integration)}>
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  </>
                ) : (
                  <Button size="sm" className="ml-auto" onClick={() => connect(capability)}>
                    <Check className="mr-1 size-3.5" />
                    Connect
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <Dialog open={configuring !== null} onOpenChange={(open) => !open && setConfiguring(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{configuring?.name} settings</DialogTitle>
            <DialogDescription>
              Non-secret settings only. Credentials for local agents stay on your machine.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            {(configuring?.config_schema ?? []).map((field) => (
              <div key={field.key} className="space-y-1.5">
                <Label htmlFor={field.key}>{field.label}</Label>
                <Input
                  id={field.key}
                  value={draft[field.key] ?? ""}
                  onChange={(event) => setDraft({ ...draft, [field.key]: event.target.value })}
                />
              </div>
            ))}
            <Button className="w-full" onClick={saveConfig}>
              Save
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
