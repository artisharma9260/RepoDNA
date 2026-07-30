import { motion } from "framer-motion";
import hero from "@/assets/hero-helix.jpg";
const PIPELINE = ["Fetch", "Parse", "Embed", "Retrieve", "Reason", "Render"];
export default function HeroVisual() {
  return <div className="relative aspect-[4/3] w-full overflow-hidden rounded-3xl border border-border/60 bg-charcoal shadow-[0_40px_80px_-40px_hsla(0,0%,0%,0.5)]">
      <img src={hero} alt="RepoDNA architecture visualization" className="absolute inset-0 h-full w-full object-cover opacity-90" />
      <div className="absolute inset-0 bg-gradient-to-t from-charcoal/85 via-charcoal/10 to-transparent" />
      <div className="absolute inset-0 grid-lines opacity-[0.08]" />

      {/* Floating pipeline stages */}
      {PIPELINE.map((label, i) => {
      const positions = ["left-[6%] top-[16%]", "left-[52%] top-[10%]", "left-[72%] top-[38%]", "left-[18%] top-[54%]", "left-[48%] top-[62%]", "left-[78%] top-[70%]"];
      const tones = ["gold", "cream", "olive", "cream", "gold", "olive"];
      return <FloatNode key={label} className={positions[i]} label={label} tone={tones[i]} />;
    })}

      {/* HUD panel */}
      <motion.div initial={{
      opacity: 0,
      y: 20
    }} animate={{
      opacity: 1,
      y: 0
    }} transition={{
      duration: 0.8,
      delay: 0.4
    }} className="absolute bottom-5 left-5 right-5 rounded-2xl border border-cream/15 bg-charcoal/70 p-4 backdrop-blur-md">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="font-mono text-[10px] uppercase tracking-[0.24em] text-gold">Live pipeline</div>
            <div className="mt-1 font-serif text-lg leading-tight text-cream">Repository intelligence engine</div>
          </div>
          <span className="rounded-full border border-gold/40 bg-gold/10 px-2.5 py-1 font-mono text-[10px] text-cream">
            GitHub REST + GraphQL
          </span>
        </div>
        <div className="mt-3 grid grid-cols-3 gap-2 text-[11px] text-cream/75">
          <Stat label="Data source" value="api.github.com" />
          <Stat label="Language index" value="GitHub Linguist" />
          <Stat label="Storage" value="Local-first" />
        </div>
      </motion.div>
    </div>;
}
function FloatNode({
  className,
  label,
  tone
}) {
  const toneClass = tone === "olive" ? "bg-olive/90 text-cream border-olive/60" : tone === "gold" ? "bg-gold/90 text-charcoal border-gold/60" : "bg-cream/95 text-charcoal border-cream/60";
  return <motion.div initial={{
    opacity: 0,
    scale: 0.9
  }} animate={{
    opacity: 1,
    scale: 1
  }} transition={{
    duration: 0.7,
    delay: Math.random() * 0.4
  }} className={`anim-float absolute rounded-full border px-3 py-1 font-mono text-[11px] shadow-lg ${toneClass} ${className}`}>
      <span className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full bg-current opacity-70" />
      {label}
    </motion.div>;
}
function Stat({
  label,
  value
}) {
  return <div className="rounded-lg border border-cream/10 bg-cream/[0.04] px-2.5 py-1.5">
      <div className="font-mono text-[9px] uppercase tracking-[0.22em] text-cream/50">{label}</div>
      <div className="truncate font-serif text-sm text-cream">{value}</div>
    </div>;
}