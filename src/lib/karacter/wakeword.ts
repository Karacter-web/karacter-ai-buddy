import { useCallback, useEffect, useRef, useState } from "react";

type RecognitionLike = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onend: (() => void) | null;
  onerror: ((event: { error: string }) => void) | null;
};

function createRecognition(): RecognitionLike | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: new () => RecognitionLike;
    webkitSpeechRecognition?: new () => RecognitionLike;
  };
  const Ctor = w.SpeechRecognition ?? w.webkitSpeechRecognition;
  return Ctor ? new Ctor() : null;
}

function normalise(text: string) {
  return text.toLowerCase().replace(/[^a-z\s]/g, " ").replace(/\s+/g, " ").trim();
}

/** Fuzzy wake-phrase match so "hey character"/"hi karacta" still trigger. */
export function matchesWakeWord(transcript: string, wakeWord: string): string | null {
  const said = normalise(transcript);
  const wake = normalise(wakeWord || "hey karacter");
  const [greeting = "hey", ...nameParts] = wake.split(" ");
  const name = nameParts.join(" ") || "karacter";
  const variants = [
    `${greeting} ${name}`,
    `${greeting} character`,
    `${greeting} karacta`,
    `${greeting} kar acter`,
    `ok ${name}`,
    `hi ${name}`,
  ];
  for (const variant of variants) {
    const index = said.indexOf(variant);
    if (index !== -1) return said.slice(index + variant.length).trim();
  }
  return null;
}

/**
 * Always-on wake word listener. Restarts recognition automatically because
 * browsers end a recognition session after each utterance or silence gap.
 */
export function useWakeWord(options: {
  enabled: boolean;
  wakeWord: string;
  onWake: (remainder: string) => void;
  paused?: boolean;
}) {
  const { enabled, wakeWord, onWake, paused = false } = options;
  const [active, setActive] = useState(false);
  const [supported, setSupported] = useState(true);
  const recognitionRef = useRef<RecognitionLike | null>(null);
  const shouldRunRef = useRef(false);
  const onWakeRef = useRef(onWake);
  const wakeWordRef = useRef(wakeWord);
  onWakeRef.current = onWake;
  wakeWordRef.current = wakeWord;

  const stop = useCallback(() => {
    shouldRunRef.current = false;
    recognitionRef.current?.abort();
    recognitionRef.current = null;
    setActive(false);
  }, []);

  useEffect(() => {
    if (!enabled || paused) {
      stop();
      return;
    }
    const probe = createRecognition();
    if (!probe) {
      setSupported(false);
      return;
    }
    shouldRunRef.current = true;

    const spin = () => {
      if (!shouldRunRef.current) return;
      const recognition = createRecognition();
      if (!recognition) return;
      recognitionRef.current = recognition;
      recognition.lang = navigator.language || "en-US";
      recognition.continuous = true;
      recognition.interimResults = false;
      recognition.onresult = (event) => {
        const transcript = Array.from(
          { length: event.results.length },
          (_, i) => event.results[i]?.[0]?.transcript ?? "",
        ).join(" ");
        const remainder = matchesWakeWord(transcript, wakeWordRef.current);
        if (remainder !== null) onWakeRef.current(remainder);
      };
      recognition.onerror = () => {
        recognition.onend = null;
        setTimeout(spin, 1200);
      };
      recognition.onend = () => {
        if (shouldRunRef.current) setTimeout(spin, 400);
      };
      try {
        recognition.start();
        setActive(true);
      } catch {
        setTimeout(spin, 1200);
      }
    };

    spin();
    return stop;
  }, [enabled, paused, stop]);

  return { active, supported };
}
