import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { AlertTriangle } from "lucide-react";

import { Button } from "@/components/ui/button";

const KEY = "karacter.beta-consent.v1";

/**
 * Pre-release acknowledgement + essential-storage notice.
 *
 * Deliberately not a tracking-cookie banner: Karacter stores only essential
 * keys, so this exists to make the beta status and permission risk explicit
 * before a tester grants anything.
 */
export function ConsentBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(window.localStorage.getItem(KEY) !== "acknowledged");
  }, []);

  if (!visible) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-background/95 px-4 py-3 backdrop-blur">
      <div className="mx-auto flex max-w-4xl flex-col gap-3 sm:flex-row sm:items-center">
        <AlertTriangle className="size-5 shrink-0 text-primary" aria-hidden />
        <p className="flex-1 text-xs leading-relaxed text-muted-foreground">
          Karacter AI is <strong className="text-foreground">pre-release developer software</strong>{" "}
          offered without guarantees. Be mindful of the permissions you grant. We use essential
          storage only and{" "}
          <strong className="text-foreground">never sell or share your data</strong>. See the{" "}
          <Link to="/disclaimer" className="text-primary underline">
            Disclaimer
          </Link>
          ,{" "}
          <Link to="/privacy" className="text-primary underline">
            Privacy
          </Link>{" "}
          and{" "}
          <Link to="/gdpr" className="text-primary underline">
            GDPR notice
          </Link>
          .
        </p>
        <Button
          size="sm"
          className="shrink-0"
          onClick={() => {
            window.localStorage.setItem(KEY, "acknowledged");
            setVisible(false);
          }}
        >
          I understand
        </Button>
      </div>
    </div>
  );
}
