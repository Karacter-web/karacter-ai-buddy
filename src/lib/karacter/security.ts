import { toast } from "sonner";
import {
  captureFaceSignatureFromCamera,
  captureVoiceSignature,
  cosineSimilarity,
  FACE_THRESHOLD,
  VOICE_THRESHOLD,
} from "./biometrics";
import type { BiometricEnrollment, Profile } from "./profile";

export type VerificationResult = {
  ok: boolean;
  reason: string;
  voiceScore?: number;
  faceScore?: number;
};

/**
 * Gate assistant activation behind the enrolled identity.
 * Returns ok:true when no identity checks are enabled.
 */
export async function verifyIdentity(
  profile: Profile | null,
  enrollments: BiometricEnrollment[],
): Promise<VerificationResult> {
  if (!profile) return { ok: true, reason: "no profile checks" };
  const needsVoice = profile.require_voice_match;
  const needsFace = profile.require_face_match;
  if (!needsVoice && !needsFace) return { ok: true, reason: "identity checks off" };

  const result: VerificationResult = { ok: true, reason: "verified" };

  if (needsVoice) {
    const enrolled = enrollments.find((e) => e.kind === "voice");
    if (!enrolled) return { ok: false, reason: "No voice enrolled yet" };
    try {
      const sample = await captureVoiceSignature(2200);
      const score = cosineSimilarity(sample, enrolled.signature);
      result.voiceScore = score;
      if (score < VOICE_THRESHOLD) return { ...result, ok: false, reason: "Voice did not match" };
    } catch (error) {
      return { ok: false, reason: error instanceof Error ? error.message : "Voice check failed" };
    }
  }

  if (needsFace) {
    const enrolled = enrollments.find((e) => e.kind === "face");
    if (!enrolled) return { ok: false, reason: "No face enrolled yet" };
    try {
      const sample = await captureFaceSignatureFromCamera();
      const score = cosineSimilarity(sample, enrolled.signature);
      result.faceScore = score;
      if (score < FACE_THRESHOLD) return { ...result, ok: false, reason: "Face did not match" };
    } catch (error) {
      return { ok: false, reason: error instanceof Error ? error.message : "Face check failed" };
    }
  }

  return result;
}

/**
 * Best-effort lockdown after a failed identity check.
 *
 * The web platform cannot lock an Android/iOS device or hibernate a PC from a
 * page — those need OS privileges. Karacter therefore locks *itself*: it
 * blanks the session, releases any wake lock, exits fullscreen and blocks the
 * UI behind a lock screen. A paired local agent capability (terminal/device
 * runtime) can escalate this to a real OS lock.
 */
export async function enforceLockdown(reason: string) {
  try {
    (window as unknown as { __karacterWakeLock?: { release: () => Promise<void> } })
      .__karacterWakeLock?.release();
  } catch {
    /* no wake lock held */
  }
  try {
    if (document.fullscreenElement) await document.exitFullscreen();
  } catch {
    /* ignore */
  }
  if (typeof window !== "undefined" && window.speechSynthesis) {
    window.speechSynthesis.cancel();
  }
  toast.error(`Karacter locked: ${reason}`);
  window.dispatchEvent(new CustomEvent("karacter:lock", { detail: { reason } }));
}
