import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import {
  Mic,
  Plug,
  ScrollText,
  LogOut,
  History,
  SquarePen,
  Settings,
  UserRoundCog,
  Code2,
  Image as ImageIcon,
  Clapperboard,
} from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { useConversations } from "@/lib/karacter/chat";

const NAV = [
  { to: "/", label: "Assistant", icon: Mic },
  { to: "/history", label: "History", icon: History },
  { to: "/integrations", label: "Integrations", icon: Plug },
  { to: "/activity", label: "Activity", icon: ScrollText },
  { to: "/onboarding", label: "Train Karacter", icon: UserRoundCog },
  { to: "/settings", label: "Settings", icon: Settings },
] as const;

export function KaracterSidebar() {
  const { state, isMobile, setOpenMobile } = useSidebar();
  const collapsed = state === "collapsed" && !isMobile;
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: conversations = [] } = useConversations();

  const close = () => isMobile && setOpenMobile(false);

  function newChat() {
    close();
    void navigate({ to: "/", search: { c: undefined } });
    void queryClient.invalidateQueries({ queryKey: ["conversations"] });
  }

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <Link to="/" onClick={close} className="flex items-center gap-2 px-1 py-1.5">
          <span className="grid size-8 shrink-0 place-items-center rounded-full bg-primary/15 text-primary ring-1 ring-primary/40">
            <Mic className="size-4" />
          </span>
          {!collapsed && (
            <span className="truncate text-sm font-semibold uppercase tracking-[0.2em]">
              Karacter
            </span>
          )}
        </Link>
        <Button
          size={collapsed ? "icon" : "sm"}
          onClick={newChat}
          className="mt-1 w-full"
          aria-label="New chat"
        >
          <SquarePen className="size-4" />
          {!collapsed && <span>New chat</span>}
        </Button>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {NAV.map((item) => (
                <SidebarMenuItem key={item.to}>
                  <SidebarMenuButton asChild isActive={pathname === item.to} tooltip={item.label}>
                    <Link to={item.to} onClick={close}>
                      <item.icon className="size-4" />
                      <span>{item.label}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Studio</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {STUDIO.map((item) => (
                <SidebarMenuItem key={item.to}>
                  <SidebarMenuButton asChild isActive={pathname === item.to} tooltip={item.label}>
                    <Link to={item.to} onClick={close}>
                      <item.icon className="size-4" />
                      <span>{item.label}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>



        {!collapsed && conversations.length > 0 && (
          <SidebarGroup>
            <SidebarGroupLabel>Recent chats</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {conversations.slice(0, 8).map((conversation) => (
                  <SidebarMenuItem key={conversation.id}>
                    <SidebarMenuButton asChild size="sm">
                      <Link to="/" search={{ c: conversation.id }} onClick={close}>
                        <span className="truncate">{conversation.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              tooltip="Sign out"
              onClick={async () => {
                await supabase.auth.signOut();
                toast.success("Signed out");
              }}
            >
              <LogOut className="size-4" />
              <span>Sign out</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
