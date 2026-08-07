import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Brain, Download, Loader2, ShieldAlert, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { AppShell } from "@/components/karacter/AppShell";
import { AuthGate } from "@/components/karacter/AuthGate";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { PERMISSIONS, usePermissions } from "@/lib/karacter/permissions";
import {
  CONSENTS,
  deleteBiometric,
  deleteMemory,
  saveProfile,
  setConsent,
  useBiometrics,
  useConsents,
  useMemories,
  useProfile,
} from "@/lib/karacter/profile";
import { deleteMyAccount, exportMyData } from "@/lib/karacter/account.functions";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Settings — Karacter AI Profile, Security & Privacy" },
      {
        name: "description",
        content:
          "Manage your Karacter profile, wake word, identity verification, device permissions, learned memories and account deletion.",
      },
      { property: "og:title", content: "Settings — Karacter AI Profile, Security & Privacy" },
      {
        property: "og:description",
        content: "Profile, security, preferences, advanced controls and account deletion.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <AuthGate>
      <AppShell>
        <Settings />
      </AppShell>
    </AuthGate>
  ),
});

function Settings() {
  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-2xl font-semibold">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Profile, security, preferences and everything Karacter knows about you.
        </p>
      </header>

      <Tabs defaultValue="profile">
        <TabsList className="flex w-full flex-wrap justify-start">
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
          <TabsTrigger value="preferences">Preferences</TabsTrigger>
          <TabsTrigger value="advanced">Advanced</TabsTrigger>
          <TabsTrigger value="account">Account</TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="pt-4">
          <ProfileTab />
        </TabsContent>
        <TabsContent value="security" className="pt-4">
          <SecurityTab />
        </TabsContent>
        <TabsContent value="preferences" className="pt-4">
          <PreferencesTab />
        </TabsContent>
        <TabsContent value="advanced" className="pt-4">
          <AdvancedTab />
        </TabsContent>
        <TabsContent value="account" className="pt-4">
          <AccountTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-4 rounded-2xl border border-border p-5">
      <div>
        <h2 className="text-sm font-semibold">{title}</h2>
        {description && <p className="mt-1 text-xs text-muted-foreground">{description}</p>}
      </div>
      {children}
    </section>
  );
}

function ProfileTab() {
  const { data: profile } = useProfile();
  const queryClient = useQueryClient();
  const [form, setForm] = useState({ display_name: "", nickname: "", gender: "", age: "" });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!profile) return;
    setForm({
      display_name: profile.display_name,
      nickname: profile.nickname,
      gender: profile.gender,
      age: profile.age ? String(profile.age) : "",
    });
  }, [profile]);

  async function save() {
    setBusy(true);
    try {
      const parsedAge = Number(form.age);
      await saveProfile({
        display_name: form.display_name.trim().slice(0, 80),
        nickname: form.nickname.trim().slice(0, 40),
        gender: form.gender,
        age: Number.isFinite(parsedAge) && parsedAge > 0 && parsedAge < 120 ? parsedAge : null,
      });
      await queryClient.invalidateQueries({ queryKey: ["profile"] });
      toast.success("Profile saved");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <Section title="Identity" description="How Karacter addresses and understands you.">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="s-name">Full name</Label>
            <Input
              id="s-name"
              value={form.display_name}
              maxLength={80}
              onChange={(e) => setForm({ ...form, display_name: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="s-nick">Preferred name</Label>
            <Input
              id="s-nick"
              value={form.nickname}
              maxLength={40}
              onChange={(e) => setForm({ ...form, nickname: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label>Gender</Label>
            <Select
              value={form.gender}
              onValueChange={(value) => setForm({ ...form, gender: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Prefer not to say" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="female">Female</SelectItem>
                <SelectItem value="male">Male</SelectItem>
                <SelectItem value="non-binary">Non-binary</SelectItem>
                <SelectItem value="undisclosed">Prefer not to say</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="s-age">Age</Label>
            <Input
              id="s-age"
              inputMode="numeric"
              value={form.age}
              onChange={(e) => setForm({ ...form, age: e.target.value.replace(/\D/g, "").slice(0, 3) })}
            />
          </div>
        </div>
        <Button onClick={save} disabled={busy}>
          {busy && <Loader2 className="size-4 animate-spin" />} Save profile
        </Button>
      </Section>
      <BiometricsSection />
    </div>
  );
}

function BiometricsSection() {
  const { data: biometrics = [] } = useBiometrics();
  const { data: profile } = useProfile();
  const queryClient = useQueryClient();

  async function remove(kind: "voice" | "face") {
    await deleteBiometric(kind);
    if (kind === "voice") await saveProfile({ require_voice_match: false });
    else await saveProfile({ require_face_match: false });
    await queryClient.invalidateQueries({ queryKey: ["biometrics"] });
    await queryClient.invalidateQueries({ queryKey: ["profile"] });
    toast.success(`${kind} signature deleted`);
  }

  return (
    <Section
      title="Voice & face training"
      description="Numeric signatures only — Karacter never stores audio or photos."
    >
      <div className="space-y-3">
        {(["voice", "face"] as const).map((kind) => {
          const enrolled = biometrics.find((b) => b.kind === kind);
          return (
            <div
              key={kind}
              className="flex items-center justify-between gap-3 rounded-xl border border-border/60 p-3"
            >
              <div>
                <p className="text-sm font-medium capitalize">{kind} signature</p>
                <p className="text-xs text-muted-foreground">
                  {enrolled
                    ? `${enrolled.samples} sample${enrolled.samples === 1 ? "" : "s"} · updated ${new Date(enrolled.updated_at).toLocaleDateString()}`
                    : "Not enrolled"}
                </p>
              </div>
              {enrolled ? (
                <Button size="sm" variant="ghost" onClick={() => void remove(kind)}>
                  <Trash2 className="size-4" /> Delete
                </Button>
              ) : (
                <Badge variant="outline">missing</Badge>
              )}
            </div>
          );
        })}
      </div>
      <Button asChild variant="secondary">
        <a href="/onboarding">
          {profile?.onboarding_completed ? "Re-train Karacter" : "Start training"}
        </a>
      </Button>
    </Section>
  );
}

function SecurityTab() {
  const { data: profile } = useProfile();
  const { data: biometrics = [] } = useBiometrics();
  const queryClient = useQueryClient();
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  const hasVoice = biometrics.some((b) => b.kind === "voice");
  const hasFace = biometrics.some((b) => b.kind === "face");

  async function toggle(patch: Record<string, boolean>) {
    await saveProfile(patch);
    await queryClient.invalidateQueries({ queryKey: ["profile"] });
  }

  async function changePassword() {
    if (password.length < 8) {
      toast.error("Use at least 8 characters");
      return;
    }
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (error) toast.error(error.message);
    else {
      setPassword("");
      toast.success("Password updated");
    }
  }

  return (
    <div className="space-y-4">
      <Section
        title="Identity verification"
        description="Biometric verification is paused while we rebuild it — Karacter is unlocked for your signed-in account."
      >
        <ToggleRow
          label="Require voice match"
          hint="Temporarily unavailable — rolling out soon."
          disabled
          checked={false}
          onChange={() => undefined}
        />
        <ToggleRow
          label="Require face match"
          hint="Temporarily unavailable — rolling out soon."
          disabled
          checked={false}
          onChange={() => undefined}
        />
        <ToggleRow
          label="Lock down on mismatch"
          hint="Temporarily unavailable — rolling out soon."
          disabled
          checked={false}
          onChange={() => undefined}
        />
        <p className="rounded-lg bg-muted/40 p-3 text-xs text-muted-foreground">
          Your Supabase account session is the active security factor. Voice and face enrolment still
          works in training — those signatures will power verification when it returns.
        </p>
      </Section>


      <Section title="Password" description="Change the password for this account.">
        <div className="flex flex-col gap-2 sm:flex-row">
          <Input
            type="password"
            value={password}
            placeholder="New password"
            autoComplete="new-password"
            onChange={(e) => setPassword(e.target.value)}
          />
          <Button onClick={changePassword} disabled={busy}>
            {busy && <Loader2 className="size-4 animate-spin" />} Update
          </Button>
        </div>
      </Section>
    </div>
  );
}

function ToggleRow({
  label,
  hint,
  checked,
  onChange,
  disabled,
}: {
  label: string;
  hint: string;
  checked: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-xl border border-border/60 p-3">
      <div className="min-w-0">
        <p className="text-sm font-medium">{label}</p>
        <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
      </div>
      <Switch checked={checked} disabled={disabled} onCheckedChange={onChange} />
    </div>
  );
}

function PreferencesTab() {
  const { data: profile } = useProfile();
  const queryClient = useQueryClient();
  const { states, request } = usePermissions();
  const [wakeWord, setWakeWord] = useState("hey karacter");

  useEffect(() => {
    if (profile?.wake_word) setWakeWord(profile.wake_word);
  }, [profile]);

  return (
    <div className="space-y-4">
      <Section title="Wake word" description="What you say to summon Karacter hands-free.">
        <div className="flex flex-col gap-2 sm:flex-row">
          <Input
            value={wakeWord}
            maxLength={30}
            onChange={(e) => setWakeWord(e.target.value.toLowerCase())}
          />
          <Button
            onClick={async () => {
              await saveProfile({ wake_word: wakeWord.trim() || "hey karacter" });
              await queryClient.invalidateQueries({ queryKey: ["profile"] });
              toast.success("Wake word saved");
            }}
          >
            Save
          </Button>
        </div>
        <ToggleRow
          label="Always listen for the wake word"
          hint="Keeps the microphone open on the assistant screen. Turn off to tap-to-talk only."
          checked={Boolean(profile?.wake_word_enabled)}
          onChange={async (value) => {
            await saveProfile({ wake_word_enabled: value });
            await queryClient.invalidateQueries({ queryKey: ["profile"] });
          }}
        />
      </Section>

      <Section
        title="Device permissions"
        description="Live browser permission state. Changes here take effect immediately."
      >
        <div className="space-y-3">
          {PERMISSIONS.map((permission) => {
            const state = states[permission.key];
            return (
              <div
                key={permission.key}
                className="flex items-start justify-between gap-4 rounded-xl border border-border/60 p-3"
              >
                <div className="min-w-0">
                  <p className="flex items-center gap-2 text-sm font-medium">
                    {permission.label}
                    <Badge
                      variant={
                        state === "granted"
                          ? "default"
                          : state === "denied"
                            ? "destructive"
                            : "outline"
                      }
                    >
                      {state}
                    </Badge>
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">{permission.why}</p>
                </div>
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={state === "granted" || state === "unsupported"}
                  onClick={() => void request(permission.key)}
                >
                  {state === "denied" ? "Retry" : "Allow"}
                </Button>
              </div>
            );
          })}
        </div>
        <p className="text-xs text-muted-foreground">
          Denied permanently? Reset it from the padlock icon in your browser&apos;s address bar.
        </p>
      </Section>

      <ConsentSection />
    </div>
  );
}

function ConsentSection() {
  const { data: consents = [] } = useConsents();
  const queryClient = useQueryClient();

  return (
    <Section title="Data & compliance" description="Grant or revoke consent at any time.">
      <div className="space-y-3">
        {CONSENTS.map((consent) => {
          const record = consents.find((c) => c.consent_key === consent.key);
          return (
            <div
              key={consent.key}
              className="flex items-start justify-between gap-4 rounded-xl border border-border/60 p-3"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium">{consent.label}</p>
                <p className="mt-1 text-xs text-muted-foreground">{consent.description}</p>
                {record && (
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    {record.granted ? "Granted" : "Revoked"}{" "}
                    {new Date(record.updated_at).toLocaleString()}
                  </p>
                )}
              </div>
              <Switch
                checked={consent.required ? true : Boolean(record?.granted)}
                disabled={consent.required}
                onCheckedChange={async (value) => {
                  await setConsent(consent.key, value);
                  await queryClient.invalidateQueries({ queryKey: ["consents"] });
                }}
              />
            </div>
          );
        })}
      </div>
    </Section>
  );
}

function AdvancedTab() {
  const { data: memories = [] } = useMemories();
  const queryClient = useQueryClient();
  const runExport = useServerFn(exportMyData);
  const [busy, setBusy] = useState(false);

  async function download() {
    setBusy(true);
    try {
      const bundle = await runExport();
      const blob = new Blob([bundle.json], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `karacter-data-${new Date().toISOString().slice(0, 10)}.json`;
      anchor.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Export failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <Section
        title="Learned memory"
        description="Facts Karacter distilled from your conversations. Delete anything that is wrong."
      >
        {memories.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nothing learned yet. Karacter starts remembering once continuous improvement is on.
          </p>
        ) : (
          <ul className="space-y-2">
            {memories.map((memory) => (
              <li
                key={memory.id}
                className="flex items-start justify-between gap-3 rounded-xl border border-border/60 p-3"
              >
                <div className="min-w-0">
                  <p className="text-sm">{memory.content}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    <Brain className="mr-1 inline size-3" />
                    {memory.category} · confidence {Math.round(memory.confidence * 100)}%
                  </p>
                </div>
                <Button
                  size="icon"
                  variant="ghost"
                  aria-label="Delete memory"
                  onClick={async () => {
                    await deleteMemory(memory.id);
                    await queryClient.invalidateQueries({ queryKey: ["memories"] });
                  }}
                >
                  <Trash2 className="size-4" />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section title="Data portability" description="Download everything Karacter stores for you.">
        <Button onClick={download} disabled={busy} variant="secondary">
          {busy ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}
          Export my data
        </Button>
      </Section>
    </div>
  );
}

function AccountTab() {
  const remove = useServerFn(deleteMyAccount);
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState("");

  async function destroy() {
    setBusy(true);
    try {
      await remove();
      await supabase.auth.signOut();
      toast.success("Account deleted");
      window.location.href = "/";
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Deletion failed");
      setBusy(false);
    }
  }

  return (
    <Section
      title="Delete account"
      description="Erases your profile, conversations, integrations, biometric signatures and login. This cannot be undone."
    >
      <div className="space-y-3">
        <Label htmlFor="confirm">
          Type <strong>DELETE</strong> to confirm
        </Label>
        <Input id="confirm" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" disabled={confirm !== "DELETE" || busy}>
              {busy ? <Loader2 className="size-4 animate-spin" /> : <ShieldAlert className="size-4" />}
              Delete my account
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Permanently delete Karacter account?</AlertDialogTitle>
              <AlertDialogDescription>
                Every conversation, integration, memory and biometric signature is destroyed
                immediately. There is no recovery.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={() => void destroy()}>Delete forever</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </Section>
  );
}
