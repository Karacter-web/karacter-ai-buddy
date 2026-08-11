import { Link } from "@tanstack/react-router";
import {
  ArrowRight,
  Boxes,
  Fingerprint,
  Mic,
  PlugZap,
  ShieldCheck,
  Sparkles,
  Waves,
} from "lucide-react";

import { LegalLinks } from "./LegalLinks";

import { Button } from "@/components/ui/button";

const CAPABILITIES = [
  "Calendar",
  "Filesystem",
  "GitHub",
  "Docker",
  "OBS",
  "Browser",
  "Terminal",
  "Spotify",
  "WhatsApp",
  "Supabase",
  "Camera",
  "Clipboard",
];

const PILLARS = [
  {
    icon: Mic,
    title: "Voice-first, wake-word ready",
    body: "Say “Hey Karacter” and it answers by name. Or type — the same brain handles both.",
  },
  {
    icon: Boxes,
    title: "Capability registry, not hardcoding",
    body: "Karacter asks the registry what exists, then plans only against capabilities you actually connected.",
  },
  {
    icon: PlugZap,
    title: "Install integrations after deploy",
    body: "Connect, configure, disable or revoke any tool from Settings — no redeploy, no code change.",
  },
  {
    icon: ShieldCheck,
    title: "Authorized execution",
    body: "The brain emits intents. Each capability executes only what its own grant permits.",
  },
];

const STEPS = [
  { n: "01", title: "You speak", body: "“Open the camera and start a note.”" },
  { n: "02", title: "Karacter plans", body: "It emits open_app(camera) plus a note intent." },
  { n: "03", title: "Tools execute", body: "Connected capabilities run the intents and report back." },
];

export function Landing() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-30 border-b border-border/60 bg-background/80 backdrop-blur">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-5">
          <div className="flex items-center gap-2.5">
            <span className="grid size-8 place-items-center rounded-lg bg-primary/15 text-primary ring-1 ring-primary/30">
              <Waves className="size-4" />
            </span>
            <span className="text-sm font-semibold tracking-tight">Karacter AI</span>
          </div>
          <nav className="flex items-center gap-1">
            <Button asChild variant="ghost" size="sm">
              <Link to="/auth">Sign in</Link>
            </Button>
            <Button asChild size="sm">
              <Link to="/auth">Get started</Link>
            </Button>
          </nav>
        </div>
      </header>

      <main>
        <section className="relative overflow-hidden">
          <div
            aria-hidden
            className="pointer-events-none absolute left-1/2 top-[-14rem] size-[38rem] -translate-x-1/2 rounded-full bg-primary/15 blur-[140px]"
          />
          <div className="relative mx-auto w-full max-w-6xl px-5 py-24 text-center sm:py-32">
            <p className="mx-auto mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs text-muted-foreground">
              <Sparkles className="size-3.5 text-primary" />
              Runtime plugin architecture · PWA · Cloudflare
            </p>
            <h1 className="mx-auto max-w-3xl text-balance text-4xl font-semibold leading-[1.05] tracking-tight sm:text-6xl">
              The assistant that only does what you{" "}
              <span className="text-primary">plugged in</span>.
            </h1>
            <p className="mx-auto mt-6 max-w-xl text-pretty text-base leading-relaxed text-muted-foreground sm:text-lg">
              Karacter AI is a voice-first assistant with a live capability registry. It decides
              which tool to invoke — your connected capabilities do the work.
            </p>
            <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
              <Button asChild size="lg" className="gap-2">
                <Link to="/auth">
                  Start talking <ArrowRight className="size-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link to="/integrations">Browse capabilities</Link>
              </Button>
            </div>

            <div className="mx-auto mt-16 max-w-2xl rounded-2xl border border-border bg-card p-6 text-left">
              <p className="text-xs uppercase tracking-widest text-muted-foreground">
                You say
              </p>
              <p className="mt-2 text-lg font-medium">“Hey Karacter, open the camera.”</p>
              <div className="my-5 h-px bg-border" />
              <p className="text-xs uppercase tracking-widest text-muted-foreground">
                Karacter emits
              </p>
              <pre className="mt-2 overflow-x-auto rounded-lg bg-muted/50 p-4 text-xs leading-relaxed text-foreground">
{`{
  "speech": "Opening your camera.",
  "intents": [
    { "capability": "camera", "action": "open" }
  ]
}`}
              </pre>
            </div>
          </div>
        </section>

        <section className="border-t border-border/60 py-20">
          <div className="mx-auto w-full max-w-6xl px-5">
            <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
              Built as a capability system
            </h2>
            <p className="mt-3 max-w-2xl text-muted-foreground">
              No third-party integration is baked into the build. Everything is discovered at
              runtime.
            </p>
            <div className="mt-10 grid gap-4 sm:grid-cols-2">
              {PILLARS.map((p) => (
                <article
                  key={p.title}
                  className="rounded-2xl border border-border bg-card p-6 transition-colors hover:border-primary/40"
                >
                  <span className="mb-4 grid size-10 place-items-center rounded-xl bg-primary/10 text-primary">
                    <p.icon className="size-5" />
                  </span>
                  <h3 className="text-base font-medium">{p.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{p.body}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="border-t border-border/60 py-20">
          <div className="mx-auto w-full max-w-6xl px-5">
            <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">How a request runs</h2>
            <ol className="mt-10 grid gap-4 sm:grid-cols-3">
              {STEPS.map((s) => (
                <li key={s.n} className="rounded-2xl border border-border bg-card p-6">
                  <span className="font-mono text-xs text-primary">{s.n}</span>
                  <h3 className="mt-3 text-base font-medium">{s.title}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">{s.body}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className="border-t border-border/60 py-20">
          <div className="mx-auto w-full max-w-6xl px-5">
            <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
              Connect what you need
            </h2>
            <p className="mt-3 max-w-2xl text-muted-foreground">
              Each capability is independently installable, configurable and revocable.
            </p>
            <ul className="mt-8 flex flex-wrap gap-2">
              {CAPABILITIES.map((c) => (
                <li
                  key={c}
                  className="rounded-full border border-border bg-card px-4 py-1.5 text-sm text-muted-foreground"
                >
                  {c}
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="border-t border-border/60 py-24">
          <div className="mx-auto w-full max-w-3xl px-5 text-center">
            <span className="mx-auto mb-6 grid size-12 place-items-center rounded-2xl bg-primary/15 text-primary">
              <Fingerprint className="size-6" />
            </span>
            <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
              Sign in and start speaking
            </h2>
            <p className="mt-3 text-muted-foreground">
              Karacter is available the moment you authenticate. Install it to your home screen and
              it behaves like a native assistant.
            </p>
            <Button asChild size="lg" className="mt-8 gap-2">
              <Link to="/auth">
                Create your account <ArrowRight className="size-4" />
              </Link>
            </Button>
          </div>
        </section>
      </main>

      <footer className="border-t border-border/60 py-10">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-center gap-4 px-5 text-xs text-muted-foreground">
          <p className="text-center">
            Karacter AI is pre-release developer software, offered without guarantees and MIT
            licensed. We work with third-party providers, but we never sell or share your data.
          </p>
          <LegalLinks />
          <p>© {new Date().getFullYear()} Karacter AI</p>
        </div>
      </footer>

    </div>
  );
}
