import { Link, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X } from "lucide-react";
import { useState } from "react";
import Logo from "@/components/branding/Logo";
const links = [{
  href: "#features",
  label: "Features"
}, {
  href: "#how",
  label: "How it works"
}, {
  href: "#showcase",
  label: "Showcase"
}, {
  href: "#pricing",
  label: "Pricing"
}, {
  href: "#faq",
  label: "FAQ"
}];
export default function Navbar() {
  const [open, setOpen] = useState(false);
  const loc = useLocation();
  return <header className="sticky top-0 z-40">
      <div className="mx-auto mt-4 max-w-7xl px-4 sm:px-6 lg:px-8">
        <nav className="glass flex items-center justify-between rounded-full px-4 py-2.5 sm:px-6">
          <Logo />
          <div className="hidden items-center gap-1 md:flex">
            {links.map(l => <a key={l.href} href={l.href} className="rounded-full px-3.5 py-2 text-sm font-medium text-foreground/80 transition hover:bg-cream-deep hover:text-foreground">
                {l.label}
              </a>)}
          </div>
          <div className="hidden items-center gap-2 md:flex">
            <Link to="/login" className="btn-ghost !py-2 !px-4">
              Sign in
            </Link>
            <Link to="/signup" className="btn-primary !py-2 !px-4">
              Get started
            </Link>
          </div>
          <button aria-label="Menu" onClick={() => setOpen(o => !o)} className="rounded-full border border-border/60 bg-cream-deep/60 p-2 md:hidden">
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </nav>
      </div>

      <AnimatePresence>
        {open && <motion.div initial={{
        opacity: 0,
        y: -8
      }} animate={{
        opacity: 1,
        y: 0
      }} exit={{
        opacity: 0,
        y: -8
      }} className="mx-auto mt-2 max-w-7xl px-4 md:hidden">
            <div className="glass rounded-2xl p-4">
              {links.map(l => <a key={l.href} href={l.href} className="block rounded-xl px-3 py-2.5 text-sm font-medium hover:bg-cream-deep" onClick={() => setOpen(false)}>
                  {l.label}
                </a>)}
              <div className="mt-2 flex items-center gap-2 border-t border-border/60 pt-3">
                <Link to="/login" className="btn-ghost flex-1 !py-2">Sign in</Link>
                <Link to="/signup" className="btn-primary flex-1 !py-2">Get started</Link>
              </div>
              <div className="mt-2 font-mono text-[10px] text-muted-foreground">{loc.pathname}</div>
            </div>
          </motion.div>}
      </AnimatePresence>
    </header>;
}