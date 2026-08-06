import { Bell, BellRing, Check, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useNotifications } from "@/lib/karacter/notifications";
import { cn } from "@/lib/utils";

export function NotificationBell() {
  const { items, unread, enabled, markAllRead, clearAll, toggleSystem } = useNotifications();

  return (
    <Popover onOpenChange={(open) => open && unread > 0 && markAllRead()}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" aria-label="Notifications">
          <Bell className="size-4" />
          {unread > 0 && (
            <span className="absolute right-1 top-1 grid min-w-4 place-items-center rounded-full bg-primary px-1 text-[9px] font-semibold text-primary-foreground">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center gap-2 border-b border-border px-3 py-2">
          <p className="text-sm font-medium">Notifications</p>
          <div className="ml-auto flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="size-7"
              onClick={() => void toggleSystem()}
              aria-label={enabled ? "Disable system notifications" : "Enable system notifications"}
              title={enabled ? "System notifications on" : "Enable system notifications"}
            >
              <BellRing className={cn("size-3.5", enabled ? "text-primary" : "text-muted-foreground")} />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="size-7"
              onClick={markAllRead}
              aria-label="Mark all as read"
            >
              <Check className="size-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="size-7"
              onClick={clearAll}
              aria-label="Clear notifications"
            >
              <Trash2 className="size-3.5" />
            </Button>
          </div>
        </div>

        <div className="max-h-80 overflow-y-auto">
          {items.length === 0 ? (
            <p className="px-3 py-8 text-center text-xs text-muted-foreground">
              No notifications yet.
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {items.map((item) => (
                <li key={item.id} className={cn("px-3 py-2", !item.read && "bg-secondary/40")}>
                  <div className="flex items-start gap-2">
                    <span
                      className={cn(
                        "mt-1.5 size-1.5 shrink-0 rounded-full",
                        item.level === "error"
                          ? "bg-destructive"
                          : item.level === "success"
                            ? "bg-primary"
                            : "bg-muted-foreground",
                      )}
                    />
                    <div className="min-w-0">
                      <p className="truncate text-xs font-medium">{item.title}</p>
                      <p className="text-[11px] text-muted-foreground">{item.body}</p>
                      <p className="mt-0.5 text-[10px] text-muted-foreground">
                        {new Date(item.createdAt).toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
