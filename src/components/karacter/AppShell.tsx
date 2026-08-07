import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { KaracterSidebar } from "@/components/karacter/KaracterSidebar";
import { NotificationBell } from "@/components/karacter/NotificationBell";
import { InstallPrompt } from "@/components/karacter/InstallPrompt";


export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background text-foreground">
        <KaracterSidebar />
        <SidebarInset className="flex min-w-0 flex-1 flex-col bg-background">
          <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b border-border/60 bg-background/80 px-3 backdrop-blur">
            <SidebarTrigger className="shrink-0" />
            <span className="min-w-0 truncate text-sm font-semibold uppercase tracking-[0.2em]">
              Karacter
            </span>
            <div className="ml-auto flex shrink-0 items-center gap-2">
              <InstallPrompt />
              <NotificationBell />
            </div>

          </header>
          <main className="mx-auto w-full max-w-4xl flex-1 px-4 pb-28 pt-6">{children}</main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
