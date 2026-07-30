import { Link } from "react-router-dom";
import logo from "@/assets/logo-mark.png";
import { cn } from "@/lib/utils";
export default function Logo({
  className,
  withWordmark = true,
  tone = "light"
}) {
  return <Link to="/" className={cn("group inline-flex items-center gap-2.5", className)}>
      <div className="relative h-9 w-9 shrink-0 overflow-hidden rounded-xl border border-border/60 bg-cream shadow-sm">
        <img src={logo} alt="RepoDNA AI logo" className="h-full w-full object-cover" />
        <div className="absolute inset-0 ring-1 ring-inset ring-gold/30" />
      </div>
      {withWordmark && <div className="flex flex-col leading-none">
          <span className={cn("font-serif text-lg font-semibold tracking-tight", tone === "dark" ? "text-cream" : "text-charcoal")}>
            RepoDNA<span className="text-gold">.</span>AI
          </span>
          <span className={cn("mt-0.5 font-mono text-[10px] uppercase tracking-[0.22em]", tone === "dark" ? "text-cream/60" : "text-muted-foreground")}>
            repo · intelligence
          </span>
        </div>}
    </Link>;
}