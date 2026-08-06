import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Check, Loader2, Mic, ScanFace, ShieldCheck, UserRound } from "lucide-react";
import { toast } from "sonner";

import { AppShell } from "@/components/karacter/AppShell";
import { AuthGate } from "@/components/karacter/AuthGate";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { captureFaceSignature, captureVoiceSignature } from "@/lib/karacter/biometrics";
import {
  CONSENTS,
  saveBiometric,
  saveProfile,
  setConsent,
  useBiometrics,
  useProfile,
} from "@/lib/karacter/profile";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/onboarding")({
  head: () => ({
    meta: [
      { title: "Train Karacter — Voice & Face Identity Setup" },
      {
        name: "description",
        content:
          "Teach Karacter your name, voice and face so the assistant only responds to you when you say Hey Karacter.",
      },
      { property: "og:title", content: "Train Karacter — Voice & Face Identity Setup" },
      {
        property: "og:description",
        content: "A four-step onboarding that enrols your identity and privacy consents.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <AuthGate>
      <AppShell>
        <Onboarding />
      </AppShell>
    </AuthGate>
  ),
});

const STEPS = ["Identity", "Consent", "Voice", "Face"] as const;

function Onboarding() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: profile } = useProfile();
  const { data: biometrics = [] } = useBiometrics();
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);

  const [displayName, setDisplayName] = useState("");
  const [nickname, setNickname] = useState("");
  const [gender, setGender] = useState("");
  const [age, setAge] = useState("");
  const [consents, setConsents] = useState<Record<string, boolean>>({
    conversation_storage: true,
  });

  useEffect(() => {
    if (!profile) return;
    setDisplayName(profile.display_name);
    setNickname(profile.nickname);
    setGender(profile.gender);
    setAge(profile.age ? String(profile.age) : "");
  }, [profile]);

  const hasVoice = biometrics.some((b) => b.kind === "voice");
  const hasFace = biometrics.some((b) => b.kind === "face");

  async function saveIdentity() {
    if (!nickname.trim()) {
      toast.error("Tell Karacter what to call you.");
      return;
    }
    const parsedAge = Number(age);
    setBusy(true);
    try {
      await saveProfile({
        display_name: displayName.trim().slice(0, 80),
        nickname: nickname.trim().slice(0, 40),
        gender,
        age: Number.isFinite(parsedAge) && parsedAge > 0 && parsedAge < 120 ? parsedAge : null,
        locale: typeof navigator !== "undefined" ? navigator.language : "",
      });
      await queryClient.invalidateQueries({ queryKey: ["profile"] });
      setStep(1);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save profile");
    } finally {
      setBusy(false);
    }
  }

  async function saveConsents() {
    setBusy(true);
    try {
      for (const consent of CONSENTS) {
        await setConsent(consent.key, consent.required ? true : Boolean(consents[consent.key]));
      }
      await queryClient.invalidateQueries({ queryKey: ["consents"] });
      setStep(2);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save consents");
    } finally {
      setBusy(false);
    }
  }

  async function finish() {
    setBusy(true);
    try {
      await saveProfile({
        onboarding_completed: true,
        wake_word_enabled: true,
        require_voice_match: hasVoice,
        require_face_match: hasFace,
      });
      await queryClient.invalidateQueries({ queryKey: ["profile"] });
      toast.success(`Karacter is trained. Say "Hey Karacter" any time.`);
      void navigate({ to: "/" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-2xl font-semibold">Train Karacter</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Four steps so the assistant knows who you are — and refuses anyone who isn&apos;t you.
        </p>
      </header>

      <div>
        <Progress value={((step + 1) / STEPS.length) * 100} />
        <div className="mt-2 flex justify-between text-xs text-muted-foreground">
          {STEPS.map((label, index) => (
            <span key={label} className={cn(index <= step && "text-primary")}>
              {label}
            </span>
          ))}
        </div>
      </div>

      {step === 0 && (
        <section className="space-y-4 rounded-2xl border border-border p-5">
          <h2 className="flex items-center gap-2 text-sm font-semibold">
            <UserRound className="size-4 text-primary" /> Who are you?
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="display-name">Full name</Label>
              <Input
                id="display-name"
                value={displayName}
                maxLength={80}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Ada Lovelace"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="nickname">What should Karacter call you?</Label>
              <Input
                id="nickname"
                value={nickname}
                maxLength={40}
                onChange={(e) => setNickname(e.target.value)}
                placeholder="Boss"
              />
            </div>
            <div className="space-y-2">
              <Label>Gender</Label>
              <Select value={gender} onValueChange={setGender}>
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
              <Label htmlFor="age">Age</Label>
              <Input
                id="age"
                inputMode="numeric"
                value={age}
                onChange={(e) => setAge(e.target.value.replace(/\D/g, "").slice(0, 3))}
                placeholder="29"
              />
            </div>
          </div>
          <Button onClick={saveIdentity} disabled={busy}>
            {busy && <Loader2 className="size-4 animate-spin" />} Continue
          </Button>
        </section>
      )}

      {step === 1 && (
        <section className="space-y-4 rounded-2xl border border-border p-5">
          <h2 className="flex items-center gap-2 text-sm font-semibold">
            <ShieldCheck className="size-4 text-primary" /> Data &amp; compliance
          </h2>
          <div className="space-y-3">
            {CONSENTS.map((consent) => (
              <div
                key={consent.key}
                className="flex items-start justify-between gap-4 rounded-xl border border-border/60 p-3"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium">
                    {consent.label}
                    {consent.required && (
                      <span className="ml-2 text-xs text-muted-foreground">(required)</span>
                    )}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">{consent.description}</p>
                </div>
                <Switch
                  checked={consent.required ? true : Boolean(consents[consent.key])}
                  disabled={consent.required}
                  onCheckedChange={(value) =>
                    setConsents((prev) => ({ ...prev, [consent.key]: value }))
                  }
                />
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">
            Biometric signatures are numeric vectors — no audio or images ever leave your device.
            You can revoke any consent and erase the data in Settings.
          </p>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => setStep(0)}>
              Back
            </Button>
            <Button onClick={saveConsents} disabled={busy}>
              {busy && <Loader2 className="size-4 animate-spin" />} Agree &amp; continue
            </Button>
          </div>
        </section>
      )}

      {step === 2 && (
        <VoiceStep
          done={hasVoice}
          onDone={async () => {
            await queryClient.invalidateQueries({ queryKey: ["biometrics"] });
            setStep(3);
          }}
          onSkip={() => setStep(3)}
          onBack={() => setStep(1)}
        />
      )}

      {step === 3 && (
        <FaceStep
          done={hasFace}
          busy={busy}
          onDone={async () => queryClient.invalidateQueries({ queryKey: ["biometrics"] })}
          onBack={() => setStep(2)}
          onFinish={finish}
        />
      )}
    </div>
  );
}

function VoiceStep({
  done,
  onDone,
  onSkip,
  onBack,
}: {
  done: boolean;
  onDone: () => Promise<void>;
  onSkip: () => void;
  onBack: () => void;
}) {
  const [recording, setRecording] = useState(false);
  const [count, setCount] = useState(0);

  async function record() {
    setRecording(true);
    try {
      const signature = await captureVoiceSignature(3000);
      await saveBiometric("voice", signature, "Wake phrase");
      setCount((c) => c + 1);
      toast.success("Voice sample captured");
      await onDone();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not capture voice");
    } finally {
      setRecording(false);
    }
  }

  return (
    <section className="space-y-4 rounded-2xl border border-border p-5">
      <h2 className="flex items-center gap-2 text-sm font-semibold">
        <Mic className="size-4 text-primary" /> Voice enrolment
      </h2>
      <p className="text-sm text-muted-foreground">
        Say <strong>“Hey Karacter, it&apos;s me”</strong> clearly for three seconds. Record two or
        three times in your normal speaking voice for a stronger match.
      </p>
      <div className="flex items-center gap-3">
        <Button onClick={record} disabled={recording}>
          {recording ? <Loader2 className="size-4 animate-spin" /> : <Mic className="size-4" />}
          {recording ? "Listening…" : "Record sample"}
        </Button>
        {(done || count > 0) && (
          <span className="flex items-center gap-1 text-xs text-primary">
            <Check className="size-3" /> enrolled
          </span>
        )}
      </div>
      <div className="flex gap-2">
        <Button variant="ghost" onClick={onBack}>
          Back
        </Button>
        <Button variant="secondary" onClick={onSkip}>
          {done || count > 0 ? "Next" : "Skip for now"}
        </Button>
      </div>
    </section>
  );
}

function FaceStep({
  done,
  busy,
  onDone,
  onBack,
  onFinish,
}: {
  done: boolean;
  busy: boolean;
  onDone: () => Promise<unknown>;
  onBack: () => void;
  onFinish: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [live, setLive] = useState(false);
  const [captured, setCaptured] = useState(false);

  useEffect(() => () => streamRef.current?.getTracks().forEach((t) => t.stop()), []);

  async function startCamera() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" } });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setLive(true);
    } catch {
      toast.error("Camera permission denied");
    }
  }

  async function capture() {
    if (!videoRef.current) return;
    try {
      const signature = await captureFaceSignature(videoRef.current);
      await saveBiometric("face", signature, "Primary face");
      setCaptured(true);
      toast.success("Face signature saved");
      await onDone();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not read face");
    }
  }

  return (
    <section className="space-y-4 rounded-2xl border border-border p-5">
      <h2 className="flex items-center gap-2 text-sm font-semibold">
        <ScanFace className="size-4 text-primary" /> Face enrolment
      </h2>
      <p className="text-sm text-muted-foreground">
        Face the camera in even lighting, then capture. Repeat once or twice to average out
        expression changes.
      </p>
      <div className="overflow-hidden rounded-xl border border-border bg-muted/30">
        <video
          ref={videoRef}
          muted
          playsInline
          className={cn("aspect-video w-full object-cover", !live && "hidden")}
        />
        {!live && (
          <div className="grid aspect-video place-items-center text-xs text-muted-foreground">
            Camera off
          </div>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {!live ? (
          <Button onClick={startCamera}>Enable camera</Button>
        ) : (
          <Button onClick={capture}>Capture face</Button>
        )}
        {(done || captured) && (
          <span className="flex items-center gap-1 text-xs text-primary">
            <Check className="size-3" /> enrolled
          </span>
        )}
      </div>
      <div className="flex gap-2">
        <Button variant="ghost" onClick={onBack}>
          Back
        </Button>
        <Button onClick={onFinish} disabled={busy}>
          {busy && <Loader2 className="size-4 animate-spin" />} Finish training
        </Button>
      </div>
    </section>
  );
}
