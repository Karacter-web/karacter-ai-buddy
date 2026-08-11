import { useCallback, useEffect, useState } from "react";

/**
 * Device-local interaction preferences.
 *
 * Kept out of the database on purpose: this is per-device presentation state
 * (a shared desktop and a phone can legitimately differ), it carries no
 * personal data, and it must be readable synchronously before the first
 * assistant reply is spoken.
 */
export type ResponseMode = "text" | "voice" | "both";

export const RESPONSE_MODES: { value: ResponseMode; label: string; hint: string }[] = [
  { value: "text", label: "Text only", hint: "Replies are written. Karacter never speaks." },
  { value: "voice", label: "Voice only", hint: "Replies are spoken aloud as well as shown." },
  { value: "both", label: "Text + voice", hint: "Written replies, read aloud when suitable." },
];

const KEY = "karacter.response-mode";
const EVENT = "karacter:response-mode";
const DEFAULT: ResponseMode = "both";

function isMode(value: unknown): value is ResponseMode {
  return value === "text" || value === "voice" || value === "both";
}

export function readResponseMode(): ResponseMode {
  if (typeof window === "undefined") return DEFAULT;
  const stored = window.localStorage.getItem(KEY);
  return isMode(stored) ? stored : DEFAULT;
}

export function writeResponseMode(mode: ResponseMode) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, mode);
  window.dispatchEvent(new CustomEvent(EVENT));
}

/**
 * Reads on mount rather than in the state initializer so SSR and the first
 * client render agree (no hydration mismatch).
 */
export function useResponseMode() {
  const [mode, setModeState] = useState<ResponseMode>(DEFAULT);

  useEffect(() => {
    const sync = () => setModeState(readResponseMode());
    sync();
    window.addEventListener(EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const setMode = useCallback((next: ResponseMode) => {
    setModeState(next);
    writeResponseMode(next);
  }, []);

  return { mode, setMode, speechEnabled: mode !== "text" };
}

/**
 * Code is never read aloud: a screen reader-style dictation of syntax is
 * unusable and slow. Detection is deliberately conservative — it only
 * suppresses speech, it never hides text.
 */
export function containsCode(text: string): boolean {
  if (!text) return false;
  if (/```|~~~/.test(text)) return true;
  if (/(^|\n)\s{4,}\S/.test(text) && /[;{}()=<>]/.test(text)) return true;
  const signals = [
    /\b(function|const|let|var|import|export|class|def|return|await|async)\b/,
    /<\/?[a-z][\w-]*[^>]*>/i,
    /\b[\w.]+\([^)]*\)\s*[;{]/,
    /\b(SELECT|INSERT|UPDATE|DELETE)\b\s+.*\b(FROM|INTO|SET|WHERE)\b/i,
    /^\s*[$#>]\s+\w+/m,
    /[{[]\s*"[\w-]+"\s*:/,
  ];
  return signals.filter((pattern) => pattern.test(text)).length >= 2;
}

/** Strips fenced blocks so a mixed answer can still be partly spoken. */
export function speakableText(text: string): string {
  const withoutFences = text.replace(/```[\s\S]*?```/g, " ").replace(/`[^`]*`/g, " ");
  const cleaned = withoutFences.replace(/\s+/g, " ").trim();
  if (!cleaned || containsCode(cleaned)) return "";
  return cleaned;
}
