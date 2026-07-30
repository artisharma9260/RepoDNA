import Logo from "@/components/branding/Logo";
import { Github, Twitter, Linkedin } from "lucide-react";
const groups = [{
  title: "Product",
  links: ["Features", "Repository Chat", "Architecture Intelligence", "Security", "Documentation Generator", "Learning Roadmap"]
}, {
  title: "Solutions",
  links: ["For Developers", "For Team Leads", "For Recruiters", "For Open Source", "For Organizations"]
}, {
  title: "Company",
  links: ["About", "Careers", "Press kit", "Contact", "Changelog"]
}, {
  title: "Resources",
  links: ["Docs", "API reference", "Blog", "Security", "Status", "Community"]
}];
export default function Footer() {
  return <footer className="mt-24 border-t border-border/70 bg-charcoal text-cream">
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="grid gap-12 lg:grid-cols-[1.4fr_2fr]">
          <div>
            <Logo tone="dark" />
            <p className="mt-5 max-w-sm font-serif text-lg leading-snug text-cream/85">
              An AI Repository Intelligence Platform. Turning every codebase into an interactive knowledge system.
            </p>
            <div className="mt-6 flex items-center gap-3">
              <a href="#" className="rounded-full border border-cream/15 p-2.5 transition hover:bg-cream/5">
                <Github className="h-4 w-4" />
              </a>
              <a href="#" className="rounded-full border border-cream/15 p-2.5 transition hover:bg-cream/5">
                <Twitter className="h-4 w-4" />
              </a>
              <a href="#" className="rounded-full border border-cream/15 p-2.5 transition hover:bg-cream/5">
                <Linkedin className="h-4 w-4" />
              </a>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-8 sm:grid-cols-4">
            {groups.map(g => <div key={g.title}>
                <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-gold">{g.title}</div>
                <ul className="mt-4 space-y-2.5">
                  {g.links.map(l => <li key={l}>
                      <a className="text-sm text-cream/70 transition hover:text-cream" href="#">
                        {l}
                      </a>
                    </li>)}
                </ul>
              </div>)}
          </div>
        </div>
        <div className="mt-14 flex flex-col items-start justify-between gap-4 border-t border-cream/10 pt-6 text-xs text-cream/60 sm:flex-row sm:items-center">
          <div>© {new Date().getFullYear()} RepoDNA AI, Inc. All rights reserved.</div>
          <div className="flex items-center gap-5">
            <a href="#" className="hover:text-cream">Privacy</a>
            <a href="#" className="hover:text-cream">Terms</a>
            <a href="#" className="hover:text-cream">Security</a>
            <span className="font-mono">SOC 2 · Type II</span>
          </div>
        </div>
      </div>
    </footer>;
}