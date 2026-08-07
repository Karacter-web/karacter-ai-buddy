import { useEffect, useState } from "react";
import { Download, Share } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type InstallEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

function isStandalone() {
  if (typeof window === "undefined") return true;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

/**
 * Add-to-home-screen entry point.
 * Chromium fires `beforeinstallprompt`, which we defer and replay on click.
 * iOS Safari has no such event, so we show the manual Share-sheet steps.
 */
export function InstallPrompt() {
  const [deferred, setDeferred] = useState<InstallEvent | null>(null);
  const [installed, setInstalled] = useState(true);
  const [iosHelp, setIosHelp] = useState(false);
  const [isIos, setIsIos] = useState(false);

  useEffect(() => {
    setInstalled(isStandalone());
    setIsIos(/iphone|ipad|ipod/i.test(window.navigator.userAgent));

    const onPrompt = (event: Event) => {
      event.preventDefault();
      setDeferred(event as InstallEvent);
    };
    const onInstalled = () => {
      setInstalled(true);
      setDeferred(null);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (installed) return null;
  if (!deferred && !isIos) return null;

  return (
    <>
      <Button
        size="sm"
        variant="outline"
        className="gap-1.5"
        onClick={async () => {
          if (!deferred) {
            setIosHelp(true);
            return;
          }
          await deferred.prompt();
          await deferred.userChoice;
          setDeferred(null);
        }}
      >
        <Download className="size-3.5" />
        <span className="hidden sm:inline">Install app</span>
      </Button>

      <Dialog open={iosHelp} onOpenChange={setIosHelp}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Karacter to your Home Screen</DialogTitle>
            <DialogDescription>
              iPhone and iPad install from the Safari share sheet.
            </DialogDescription>
          </DialogHeader>
          <ol className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-center gap-2">
              <Share className="size-4 text-primary" /> 1. Tap the Share button in Safari.
            </li>
            <li>2. Choose “Add to Home Screen”.</li>
            <li>3. Tap “Add” — Karacter then opens full screen like a native app.</li>
          </ol>
        </DialogContent>
      </Dialog>
    </>
  );
}
