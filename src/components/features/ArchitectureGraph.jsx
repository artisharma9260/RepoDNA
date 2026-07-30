import { motion } from "framer-motion";
const kindStyle = {
  controller: "bg-olive/90 text-cream border-olive-dark",
  service: "bg-charcoal text-cream border-charcoal-soft",
  data: "bg-gold/90 text-charcoal border-gold",
  gateway: "bg-cream text-charcoal border-olive",
  external: "bg-cream-deep text-charcoal border-border"
};
export default function ArchitectureGraph({
  folders
}) {
  const width = 1040;
  const height = 440;
  const centerX = width / 2;
  const centerY = height / 2 - 10;
  const radius = 170;
  const nodes = folders.map((f, i) => {
    if (i === 0) return {
      ...f,
      x: centerX - 80,
      y: centerY - 22,
      isCenter: true
    };
    const angle = (i - 1) / Math.max(1, folders.length - 1) * Math.PI * 2;
    return {
      ...f,
      x: centerX - 80 + Math.cos(angle) * radius,
      y: centerY - 22 + Math.sin(angle) * radius * 0.75,
      isCenter: false
    };
  });
  const center = nodes[0];
  return <div className="relative overflow-x-auto rounded-2xl border border-border/70 bg-cream-deep/40">
      <div className="relative min-w-[1040px]" style={{
      height
    }}>
        <svg viewBox={`0 0 ${width} ${height}`} className="block h-[440px] w-full">
          <defs>
            <marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto">
              <path d="M0,0 L10,5 L0,10 Z" fill="hsl(0 0% 30%)" />
            </marker>
            <pattern id="grid" width="24" height="24" patternUnits="userSpaceOnUse">
              <path d="M24 0H0V24" fill="none" stroke="hsla(0,0%,0%,0.05)" strokeWidth="1" />
            </pattern>
          </defs>
          <rect width={width} height={height} fill="url(#grid)" />
          {center && nodes.slice(1).map((n, i) => {
          const x1 = center.x + 80;
          const y1 = center.y + 22;
          const x2 = n.x + 80;
          const y2 = n.y + 22;
          const mx = (x1 + x2) / 2;
          const my = (y1 + y2) / 2;
          const path = `M ${x1} ${y1} Q ${mx} ${my - 20}, ${x2} ${y2}`;
          const stroke = n.kind === "data" ? "hsl(38 45% 45%)" : n.kind === "gateway" ? "hsl(71 34% 36%)" : "hsl(0 0% 30%)";
          return <path key={i} d={path} fill="none" stroke={stroke} strokeWidth={1.6} markerEnd="url(#arrow)" opacity={0.75} />;
        })}
        </svg>

        {nodes.map((n, i) => <motion.div key={n.path} initial={{
        opacity: 0,
        y: 6
      }} animate={{
        opacity: 1,
        y: 0
      }} transition={{
        delay: i * 0.05
      }} className={`absolute flex h-11 w-40 items-center justify-center rounded-xl border px-3 text-center font-mono text-[11px] shadow-sm ${kindStyle[n.kind]}`} style={{
        left: n.x,
        top: n.y
      }} title={`${n.path}/ · ${n.files} files`}>
            <span className="truncate">
              {n.name}/
              <span className="ml-1 opacity-70">· {n.files}</span>
            </span>
          </motion.div>)}
      </div>

      <div className="flex flex-wrap items-center gap-3 border-t border-border/70 bg-cream/60 px-4 py-3 text-[11px]">
        <Legend color="hsl(71 34% 36%)" label="Controller/Routes" />
        <Legend color="hsl(0 0% 11%)" label="Service/Domain" />
        <Legend color="hsl(38 45% 60%)" label="Data/Model" />
        <Legend color="hsl(40 20% 85%)" label="Infra/Other" />
        <span className="ml-auto font-mono text-muted-foreground">
          {nodes.length} folders · derived from git tree
        </span>
      </div>
    </div>;
}
function Legend({
  color,
  label
}) {
  return <span className="inline-flex items-center gap-1.5">
      <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{
      background: color
    }} />
      <span className="text-muted-foreground">{label}</span>
    </span>;
}