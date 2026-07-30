import Sparkline from "./Sparkline";
import { ArrowUpRight, ArrowDownRight } from "lucide-react";
import { cn } from "@/lib/utils";
export default function StatCard({
  label,
  value,
  delta,
  suffix,
  trend,
  color,
  featured
}) {
  const up = (delta ?? 0) >= 0;
  return <div className={cn("glass relative overflow-hidden rounded-2xl p-5", featured && "bg-charcoal text-cream glass-dark")}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className={cn("font-mono text-[10px] uppercase tracking-[0.22em]", featured ? "text-cream/55" : "text-muted-foreground")}>
            {label}
          </div>
          <div className="mt-2 font-serif text-3xl font-semibold tracking-tight">
            {value}
            {suffix && <span className={cn("ml-1 text-base", featured ? "text-cream/60" : "text-muted-foreground")}>
                {suffix}
              </span>}
          </div>
        </div>
        {typeof delta === "number" && <span className={cn("inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[11px] font-medium", up ? "border-olive/40 bg-olive/10 text-olive-dark" : "border-destructive/30 bg-destructive/10 text-destructive")}>
            {up ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
            {Math.abs(delta)}%
          </span>}
      </div>
      {trend && <div className="mt-3">
          <Sparkline data={trend} color={color ?? "hsl(71 34% 36%)"} height={44} />
        </div>}
    </div>;
}