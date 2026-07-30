import { cn } from "@/lib/utils";
export default function Sparkline({
  data,
  color = "hsl(71 34% 36%)",
  height = 44,
  className
}) {
  const w = 200;
  const h = height;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const step = w / (data.length - 1);
  const points = data.map((v, i) => {
    const x = i * step;
    const y = h - (v - min) / range * (h - 6) - 3;
    return `${x},${y}`;
  });
  const line = "M" + points.join(" L ");
  const area = `${line} L ${w},${h} L 0,${h} Z`;
  return <svg viewBox={`0 0 ${w} ${h}`} className={cn("w-full", className)} preserveAspectRatio="none">
      <defs>
        <linearGradient id={`spark-${color}`} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.4" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#spark-${color})`} />
      <path d={line} stroke={color} strokeWidth={1.75} fill="none" strokeLinecap="round" />
    </svg>;
}