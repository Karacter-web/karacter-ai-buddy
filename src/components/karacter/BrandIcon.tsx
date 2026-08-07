import {
  siDocker,
  siGithub,
  siGooglecalendar,
  siGooglechrome,
  siGmail,
  siNeon,
  siObsstudio,
  siSpotify,
  siSupabase,
  siWhatsapp,
  siGnubash,
  type SimpleIcon,
} from "simple-icons";
import { Calculator, Code2, Folder, Smartphone, Plug } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Real brand marks for capabilities that map to a known platform.
 * Everything else falls back to a neutral lucide glyph so the registry can
 * still grow at runtime with capabilities we have never seen before.
 */
const BRANDS: Record<string, SimpleIcon> = {
  github: siGithub,
  docker: siDocker,
  spotify: siSpotify,
  supabase: siSupabase,
  neon: siNeon,
  obs: siObsstudio,
  whatsapp: siWhatsapp,
  calendar: siGooglecalendar,
  browser: siGooglechrome,
  email: siGmail,
  terminal: siGnubash,
};

const FALLBACKS: Record<string, typeof Plug> = {
  calculator: Calculator,
  device: Smartphone,
  filesystem: Folder,
  vscode: Code2,
};

export function BrandIcon({
  capabilityId,
  className,
}: {
  capabilityId: string;
  className?: string;
}) {
  const brand = BRANDS[capabilityId];
  if (brand) {
    return (
      <svg
        role="img"
        aria-label={`${brand.title} logo`}
        viewBox="0 0 24 24"
        className={cn("size-5", className)}
        fill={`#${brand.hex}`}
      >
        <path d={brand.path} />
      </svg>
    );
  }
  const Fallback = FALLBACKS[capabilityId] ?? Plug;
  return <Fallback className={cn("size-5 text-primary", className)} aria-hidden />;
}

export function hasBrand(capabilityId: string) {
  return Boolean(BRANDS[capabilityId]);
}
