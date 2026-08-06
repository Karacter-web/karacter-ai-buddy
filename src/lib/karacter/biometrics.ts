/**
 * On-device biometric signatures.
 *
 * Voice: an averaged, normalised FFT magnitude envelope of the speaker's
 * timbre while saying the wake phrase.
 * Face: a contrast-normalised 16x16 grayscale eigen-style vector of the
 * detected face region (falls back to the centre crop when the browser has no
 * FaceDetector).
 *
 * Both are irreversible-ish, low dimensional vectors — never raw media — and
 * are compared with cosine similarity. This is device-grade convenience
 * verification, not a security-grade biometric system.
 */

export const VOICE_BINS = 48;
export const FACE_SIZE = 16;

export function cosineSimilarity(a: number[], b: number[]): number {
  if (!a.length || a.length !== b.length) return 0;
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i += 1) {
    dot += a[i]! * b[i]!;
    na += a[i]! * a[i]!;
    nb += b[i]! * b[i]!;
  }
  if (!na || !nb) return 0;
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

function normalise(vector: number[]): number[] {
  const max = Math.max(...vector, 1e-6);
  return vector.map((v) => v / max);
}

export function mergeSignatures(existing: number[], next: number[], samples: number): number[] {
  if (existing.length !== next.length) return next;
  return normalise(existing.map((v, i) => (v * samples + next[i]!) / (samples + 1)));
}

/** Record `ms` of microphone audio and reduce it to a voice signature. */
export async function captureVoiceSignature(ms = 3000): Promise<number[]> {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  try {
    const AudioCtx =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const context = new AudioCtx();
    const source = context.createMediaStreamSource(stream);
    const analyser = context.createAnalyser();
    analyser.fftSize = 1024;
    analyser.smoothingTimeConstant = 0.6;
    source.connect(analyser);

    const bins = new Uint8Array(analyser.frequencyBinCount);
    const accumulator = new Array<number>(VOICE_BINS).fill(0);
    let frames = 0;
    const step = Math.floor(analyser.frequencyBinCount / VOICE_BINS);
    const deadline = performance.now() + ms;

    await new Promise<void>((resolve) => {
      const tick = () => {
        analyser.getByteFrequencyData(bins);
        const energy = bins.reduce((sum, v) => sum + v, 0);
        // Ignore silence so background noise does not dilute the signature.
        if (energy > bins.length * 8) {
          for (let i = 0; i < VOICE_BINS; i += 1) {
            let sum = 0;
            for (let j = 0; j < step; j += 1) sum += bins[i * step + j] ?? 0;
            accumulator[i] = accumulator[i]! + sum / step;
          }
          frames += 1;
        }
        if (performance.now() >= deadline) resolve();
        else requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });

    await context.close();
    if (frames < 5) throw new Error("Not enough speech captured — please speak louder.");
    return normalise(accumulator.map((v) => v / frames));
  } finally {
    stream.getTracks().forEach((t) => t.stop());
  }
}

type FaceDetectorLike = {
  detect: (source: CanvasImageSource) => Promise<Array<{ boundingBox: DOMRectReadOnly }>>;
};

async function detectFaceBox(canvas: HTMLCanvasElement): Promise<DOMRectReadOnly | null> {
  const Ctor = (window as unknown as { FaceDetector?: new (o?: unknown) => FaceDetectorLike })
    .FaceDetector;
  if (!Ctor) return null;
  try {
    const faces = await new Ctor({ fastMode: true, maxDetectedFaces: 1 }).detect(canvas);
    return faces[0]?.boundingBox ?? null;
  } catch {
    return null;
  }
}

/** Reduce a live video frame to a face signature vector. */
export async function captureFaceSignature(video: HTMLVideoElement): Promise<number[]> {
  const width = video.videoWidth || 320;
  const height = video.videoHeight || 240;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas unavailable");
  ctx.drawImage(video, 0, 0, width, height);

  const box = await detectFaceBox(canvas);
  const side = Math.min(width, height) * 0.7;
  const region = box ?? {
    x: (width - side) / 2,
    y: (height - side) / 2,
    width: side,
    height: side,
  };

  const out = document.createElement("canvas");
  out.width = FACE_SIZE;
  out.height = FACE_SIZE;
  const outCtx = out.getContext("2d");
  if (!outCtx) throw new Error("Canvas unavailable");
  outCtx.drawImage(
    canvas,
    region.x,
    region.y,
    region.width,
    region.height,
    0,
    0,
    FACE_SIZE,
    FACE_SIZE,
  );

  const pixels = outCtx.getImageData(0, 0, FACE_SIZE, FACE_SIZE).data;
  const gray: number[] = [];
  for (let i = 0; i < pixels.length; i += 4) {
    gray.push(0.299 * pixels[i]! + 0.587 * pixels[i + 1]! + 0.114 * pixels[i + 2]!);
  }
  const mean = gray.reduce((s, v) => s + v, 0) / gray.length;
  const variance = gray.reduce((s, v) => s + (v - mean) ** 2, 0) / gray.length;
  if (variance < 25) throw new Error("Frame too flat — improve lighting and face the camera.");
  const sd = Math.sqrt(variance) || 1;
  // Contrast-normalised so lighting shifts do not change identity.
  return gray.map((v) => (v - mean) / sd);
}

/** Grab a single verification frame from the camera without showing UI. */
export async function captureFaceSignatureFromCamera(): Promise<number[]> {
  const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" } });
  const video = document.createElement("video");
  video.srcObject = stream;
  video.muted = true;
  video.playsInline = true;
  try {
    await video.play();
    await new Promise((resolve) => setTimeout(resolve, 600));
    return await captureFaceSignature(video);
  } finally {
    stream.getTracks().forEach((t) => t.stop());
  }
}

export const VOICE_THRESHOLD = 0.9;
export const FACE_THRESHOLD = 0.72;
