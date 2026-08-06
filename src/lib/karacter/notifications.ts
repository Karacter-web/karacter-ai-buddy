import { useCallback, useEffect, useState } from "react";

export type AppNotification = {
  id: string;
  title: string;
  body: string;
  level: "info" | "success" | "error";
  createdAt: string;
  read: boolean;
};

const STORAGE_KEY = "karacter.notifications";
const PERMISSION_KEY = "karacter.notifications.enabled";
const EVENT = "karacter:notifications";

function read(): AppNotification[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as AppNotification[]) : [];
  } catch {
    return [];
  }
}

function write(items: AppNotification[]) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items.slice(0, 50)));
  window.dispatchEvent(new CustomEvent(EVENT));
}

export function pushNotification(input: {
  title: string;
  body: string;
  level?: AppNotification["level"];
}) {
  if (typeof window === "undefined") return;
  const item: AppNotification = {
    id: crypto.randomUUID(),
    title: input.title,
    body: input.body,
    level: input.level ?? "info",
    createdAt: new Date().toISOString(),
    read: false,
  };
  write([item, ...read()]);

  const enabled = window.localStorage.getItem(PERMISSION_KEY) === "true";
  if (enabled && "Notification" in window && Notification.permission === "granted") {
    try {
      new Notification(item.title, { body: item.body, icon: "/icons/karacter-192.png" });
    } catch {
      /* system notifications unavailable */
    }
  }
}

export function useNotifications() {
  const [items, setItems] = useState<AppNotification[]>([]);
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    const sync = () => setItems(read());
    sync();
    setEnabled(window.localStorage.getItem(PERMISSION_KEY) === "true");
    window.addEventListener(EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const markAllRead = useCallback(() => {
    write(read().map((n) => ({ ...n, read: true })));
  }, []);

  const clearAll = useCallback(() => write([]), []);

  const toggleSystem = useCallback(async () => {
    if (enabled) {
      window.localStorage.setItem(PERMISSION_KEY, "false");
      setEnabled(false);
      return;
    }
    if (!("Notification" in window)) return;
    const permission =
      Notification.permission === "granted"
        ? "granted"
        : await Notification.requestPermission();
    const next = permission === "granted";
    window.localStorage.setItem(PERMISSION_KEY, String(next));
    setEnabled(next);
  }, [enabled]);

  return {
    items,
    unread: items.filter((n) => !n.read).length,
    enabled,
    markAllRead,
    clearAll,
    toggleSystem,
  };
}
