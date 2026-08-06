import type { Capability, Integration, Intent } from "./types";

export type ExecutionResult = {
  status: "done" | "failed" | "unsupported" | "blocked";
  detail: string;
};

function openInNewTab(url: string) {
  window.open(url, "_blank", "noopener,noreferrer");
}

function safeEvaluate(expression: string): number {
  if (!/^[\d\s+\-*/().%]+$/.test(expression)) throw new Error("Unsupported expression");
  // eslint-disable-next-line no-new-func
  const value = Function(`"use strict"; return (${expression});`)() as unknown;
  if (typeof value !== "number" || !Number.isFinite(value)) throw new Error("Invalid result");
  return value;
}

const DEVICE_APP_URLS: Record<string, (q: string) => string> = {
  maps: (q) => `https://www.google.com/maps/search/${encodeURIComponent(q || "")}`,
  phone: (q) => `tel:${q}`,
  sms: (q) => `sms:${q}`,
  email: (q) => `mailto:${q}`,
  music: () => "https://open.spotify.com",
  browser: (q) => (q.startsWith("http") ? q : `https://www.google.com/search?q=${encodeURIComponent(q)}`),
};

async function openCamera(): Promise<ExecutionResult> {
  if (!navigator.mediaDevices?.getUserMedia) {
    return { status: "unsupported", detail: "This device has no camera API available." };
  }
  const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
  window.dispatchEvent(new CustomEvent("karacter:camera", { detail: stream }));
  return { status: "done", detail: "Camera opened." };
}

export async function executeIntent(
  intent: Intent,
  ctx: { capability?: Capability; integration?: Integration },
): Promise<ExecutionResult> {
  const { capability, integration } = ctx;

  if (!capability) {
    return { status: "blocked", detail: `Capability "${intent.capability}" is not in the registry.` };
  }
  if (!integration || !integration.enabled) {
    return { status: "blocked", detail: `${capability.name} is not connected or is disabled.` };
  }

  const args = intent.args ?? {};
  const str = (k: string) => String(args[k] ?? "");

  try {
    switch (capability.id) {
      case "device": {
        if (intent.action === "open_app") {
          const app = str("app").toLowerCase();
          if (app.includes("camera")) return await openCamera();
          const builder = DEVICE_APP_URLS[app];
          if (!builder) return { status: "unsupported", detail: `No handler for "${app}" on this device.` };
          openInNewTab(builder(str("query")));
          return { status: "done", detail: `Opened ${app}.` };
        }
        if (intent.action === "copy_to_clipboard") {
          await navigator.clipboard.writeText(str("text"));
          return { status: "done", detail: "Copied to clipboard." };
        }
        if (intent.action === "share") {
          if (!navigator.share) return { status: "unsupported", detail: "Sharing is not supported here." };
          await navigator.share({ text: str("text"), ...(str("url") ? { url: str("url") } : {}) });
          return { status: "done", detail: "Share sheet opened." };
        }
        if (intent.action === "vibrate") {
          navigator.vibrate?.(Number(args["ms"] ?? 200));
          return { status: "done", detail: "Vibrated." };
        }
        break;
      }
      case "browser": {
        if (intent.action === "open_url") {
          openInNewTab(str("url"));
          return { status: "done", detail: `Opened ${str("url")}.` };
        }
        if (intent.action === "web_search") {
          openInNewTab(`https://www.google.com/search?q=${encodeURIComponent(str("query"))}`);
          return { status: "done", detail: `Searched for "${str("query")}".` };
        }
        break;
      }
      case "calculator": {
        if (intent.action === "evaluate") {
          return { status: "done", detail: `${str("expression")} = ${safeEvaluate(str("expression"))}` };
        }
        break;
      }
      default:
        break;
    }

    if (capability.runtime === "agent") {
      const agentUrl = String(integration.config?.["agent_url"] ?? integration.config?.["ws_url"] ?? "");
      if (!agentUrl) {
        return { status: "blocked", detail: `${capability.name} has no local agent URL configured.` };
      }
      const res = await fetch(`${agentUrl.replace(/\/$/, "")}/invoke`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ capability: capability.id, action: intent.action, args }),
      });
      const text = await res.text();
      return res.ok
        ? { status: "done", detail: text.slice(0, 500) || "Agent executed the action." }
        : { status: "failed", detail: `Agent responded ${res.status}: ${text.slice(0, 300)}` };
    }

    return {
      status: "unsupported",
      detail: `${capability.name}.${intent.action} needs a connected provider to execute.`,
    };
  } catch (error) {
    return { status: "failed", detail: error instanceof Error ? error.message : String(error) };
  }
}
