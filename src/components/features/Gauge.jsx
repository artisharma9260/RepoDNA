import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
function scoreColor(v) {
  if (v >= 80) return "hsl(71 34% 36%)"; // olive
  if (v >= 65) return "hsl(38 45% 60%)"; // gold
  if (v >= 45) return "hsl(30 70% 55%)"; // amber
  return "hsl(8 65% 48%)"; // destructive
}
export default function Gauge({
  value,
  label,
  sublabel,
  size = 140,
  animate = true,
  large = false
}) {
  const [v, setV] = useState(animate ? 0 : value);
  useEffect(() => {
    if (!animate) return;
    let raf = 0;
    const start = performance.now();
    const duration = 1200;
    const from = 0;
    const step = t => {
      const p = Math.min(1, (t - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setV(Math.round(from + (value - from) * eased));
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [value, animate]);
  const radius = size / 2 - 10;
  const circ = 2 * Math.PI * radius;
  const offset = circ * (1 - Math.max(0, Math.min(100, v)) / 100);
  const color = scoreColor(value);
  return <div className="flex flex-col items-center">
      <div className="relative" style={{
      width: size,
      height: size
    }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="hsl(40 20% 85%)" strokeWidth={10} />
          <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={color} strokeWidth={10} strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={offset} transform={`rotate(-90 ${size / 2} ${size / 2})`} style={{
          transition: "stroke-dashoffset 200ms ease"
        }} />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <div className={cn("font-serif font-semibold tracking-tight leading-none", large ? "text-5xl" : "text-3xl")} style={{
          color
        }}>
            {v}
          </div>
          <div className="mt-1 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">/ 100</div>
        </div>
      </div>
      <div className={cn("mt-3 text-center", large ? "" : "text-sm")}>
        <div className="font-semibold tracking-tight">{label}</div>
        {sublabel && <div className="mt-0.5 text-xs text-muted-foreground">{sublabel}</div>}
      </div>
    </div>;
}