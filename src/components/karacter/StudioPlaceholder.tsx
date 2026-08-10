import type { LucideIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";

type Props = {
  name: string;
  tagline: string;
  description: string;
  icon: LucideIcon;
  planned: string[];
};

/**
 * Placeholder surface for the Karacter studio products. These are PLANNED —
 * no capability is registered and nothing executes yet.
 */
export function StudioPlaceholder({ name, tagline, description, icon: Icon, planned }: Props) {
  return (
    <div className="mx-auto flex max-w-2xl flex-col items-center gap-6 py-10 text-center">
      <span className="grid size-16 place-items-center rounded-2xl bg-primary/10 text-primary ring-1 ring-primary/40">
        <Icon className="size-8" />
      </span>
      <div className="space-y-2">
        <div className="flex items-center justify-center gap-2">
          <h1 className="text-2xl font-semibold tracking-tight">{name}</h1>
          <Badge variant="outline">Coming soon</Badge>
        </div>
        <p className="text-sm font-medium text-primary">{tagline}</p>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      <ul className="grid w-full gap-2 text-left sm:grid-cols-2">
        {planned.map((item) => (
          <li
            key={item}
            className="rounded-xl border border-dashed border-border/70 px-3 py-2 text-sm text-muted-foreground"
          >
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}
