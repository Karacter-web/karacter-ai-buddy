import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type PermissionKey = "microphone" | "camera" | "notifications" | "geolocation";
export type PermissionState = "granted" | "denied" | "prompt" | "unsupported";

export const PERMISSIONS: { key: PermissionKey; label: string; why: string }[] = [
  {
    key: "microphone",
    label: "Microphone",
    why: "Wake word detection, voice commands and voice identity verification.",
  },
  {
    key: "camera",
    label: "Camera",
    why: "Face identity verification and camera capability actions.",
  },
  {
    key: "notifications",
    label: "Notifications",
    why: "Alerts when Karacter finishes or fails a task in the background.",
  },
  {
    key: "geolocation",
    label: "Location",
    why: "Location-aware answers such as weather and nearby places.",
  },
];

const QUERY_NAME: Record<PermissionKey, PermissionName | undefined> = {
  microphone: "microphone" as PermissionName,
  camera: "camera" as PermissionName,
  notifications: "notifications" as PermissionName,
  geolocation: "geolocation" as PermissionName,
};

async function readState(key: PermissionKey): Promise<PermissionState> {
  if (typeof navigator === "undefined") return "unsupported";
  if (key === "notifications" && typeof Notification === "undefined") return "unsupported";
  if (!("permissions" in navigator) || !navigator.permissions?.query) {
    if (key === "notifications" && typeof Notification !== "undefined") {
      return Notification.permission === "default" ? "prompt" : Notification.permission;
    }
    return "unsupported";
  }
  try {
    const status = await navigator.permissions.query({ name: QUERY_NAME[key]! });
    return status.state as PermissionState;
  } catch {
    return "unsupported";
  }
}

async function persist(key: PermissionKey, state: PermissionState) {
  const { data } = await supabase.auth.getUser();
  if (!data.user) return;
  await supabase
    .from("permission_grants")
    .upsert(
      { user_id: data.user.id, permission: key, state, updated_at: new Date().toISOString() },
      { onConflict: "user_id,permission" },
    );
}

/** Live permission state for every capability-critical browser permission. */
export function usePermissions() {
  const [states, setStates] = useState<Record<PermissionKey, PermissionState>>({
    microphone: "prompt",
    camera: "prompt",
    notifications: "prompt",
    geolocation: "prompt",
  });

  const refresh = useCallback(async () => {
    const entries = await Promise.all(
      PERMISSIONS.map(async (p) => [p.key, await readState(p.key)] as const),
    );
    setStates(Object.fromEntries(entries) as Record<PermissionKey, PermissionState>);
    for (const [key, state] of entries) void persist(key, state);
  }, []);

  useEffect(() => {
    void refresh();
    if (typeof navigator === "undefined" || !navigator.permissions?.query) return;
    const disposers: Array<() => void> = [];
    let cancelled = false;

    void (async () => {
      for (const p of PERMISSIONS) {
        try {
          const status = await navigator.permissions.query({ name: QUERY_NAME[p.key]! });
          if (cancelled) return;
          const onChange = () => {
            const next = status.state as PermissionState;
            setStates((prev) => ({ ...prev, [p.key]: next }));
            void persist(p.key, next);
          };
          status.addEventListener("change", onChange);
          disposers.push(() => status.removeEventListener("change", onChange));
        } catch {
          /* permission not queryable in this browser */
        }
      }
    })();

    return () => {
      cancelled = true;
      disposers.forEach((dispose) => dispose());
    };
  }, [refresh]);

  const request = useCallback(
    async (key: PermissionKey) => {
      try {
        if (key === "microphone") {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          stream.getTracks().forEach((t) => t.stop());
        } else if (key === "camera") {
          const stream = await navigator.mediaDevices.getUserMedia({ video: true });
          stream.getTracks().forEach((t) => t.stop());
        } else if (key === "notifications") {
          await Notification.requestPermission();
        } else {
          await new Promise<void>((resolve) =>
            navigator.geolocation.getCurrentPosition(
              () => resolve(),
              () => resolve(),
              { timeout: 8000 },
            ),
          );
        }
      } catch {
        /* denial is reflected by the permission state below */
      }
      await refresh();
    },
    [refresh],
  );

  return { states, request, refresh };
}
