import { Link } from "@tanstack/react-router";

export const LEGAL_LINKS = [
  { to: "/privacy", label: "Privacy" },
  { to: "/terms", label: "Terms" },
  { to: "/cookies", label: "Cookies" },
  { to: "/disclaimer", label: "Disclaimer" },
  { to: "/gdpr", label: "GDPR & Data Rights" },
  { to: "/license", label: "MIT License" },
] as const;

/** One source of truth so every surface exposes the same compliance links. */
export function LegalLinks({ className = "" }: { className?: string }) {
  return (
    <div
      className={`flex flex-wrap justify-center gap-x-4 gap-y-1 text-[11px] text-muted-foreground ${className}`}
    >
      {LEGAL_LINKS.map((link) => (
        <Link key={link.to} to={link.to} className="hover:text-foreground">
          {link.label}
        </Link>
      ))}
      <a href="mailto:support@karacterhub.xyz" className="hover:text-foreground">
        support@karacterhub.xyz
      </a>
    </div>
  );
}
