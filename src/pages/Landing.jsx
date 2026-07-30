import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { ArrowRight, Github, Sparkles, Network, MessagesSquare, BookOpenText, ShieldCheck, Wrench, Users2, Compass, Zap } from "lucide-react";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import HeroVisual from "@/components/features/HeroVisual";
import { fetchRepo, idOf, parseGithubUrl } from "@/lib/github";
import { upsertRepo } from "@/lib/store";
import { useAuth } from "@/hooks/useAuth";
const FEATURES = [{
  icon: Network,
  title: "Architecture Intelligence",
  desc: "AI-generated system graphs with data flow, service boundaries, and design patterns extracted from source.",
  tone: "olive"
}, {
  icon: MessagesSquare,
  title: "AI Repository Chat",
  desc: "Grounded answers powered by Gemini. Ask 'where is auth?' — get the file, the flow, and the citations.",
  tone: "gold"
}, {
  icon: BookOpenText,
  title: "Documentation Automation",
  desc: "Regenerate README, API docs, dev guides, and system design notes in one click, cached in the cloud.",
  tone: "olive"
}, {
  icon: ShieldCheck,
  title: "Security Analyzer",
  desc: "AI + heuristic scan for secrets, weak auth, injection, and dependency risks with prioritized fixes.",
  tone: "gold"
}, {
  icon: Wrench,
  title: "Technical Debt Detector",
  desc: "Detect dead code, oversized modules, missing tests, and undocumented APIs with cleanup effort estimates.",
  tone: "olive"
}, {
  icon: Users2,
  title: "Contributor Intelligence",
  desc: "Ownership maps, knowledge distribution, activity trends and bus-factor indicators for every repo.",
  tone: "gold"
}, {
  icon: Compass,
  title: "Onboarding Roadmaps",
  desc: "AI-tailored beginner → advanced learning plans grounded in the specific repository's actual files.",
  tone: "olive"
}, {
  icon: Zap,
  title: "PR Intelligence",
  desc: "Impact summaries, risk scores, affected modules and review suggestions on every pull request.",
  tone: "gold"
}];
const STEPS = [{
  n: "01",
  title: "Paste any GitHub URL",
  desc: "Public repositories work instantly — sign in to save them to your cloud workspace."
}, {
  n: "02",
  title: "We fetch the repository DNA",
  desc: "Metadata, languages, contributors, tree structure, PRs and commits — live from the GitHub API."
}, {
  n: "03",
  title: "AI generates the insights",
  desc: "Gemini reads the repository, produces docs, security reports, interview kits, code reviews and more."
}, {
  n: "04",
  title: "Explore & collaborate",
  desc: "Chat with the repo, share notes with your team, and onboard new engineers 10x faster."
}];
const FAQ = [{
  q: "How is RepoDNA different from GitHub Copilot?",
  a: "Copilot writes code inline. RepoDNA is a whole-repository intelligence layer — architecture graphs, RAG chat, documentation automation, security and contributor analytics, all cross-linked and grounded in real files."
}, {
  q: "Which AI model powers RepoDNA?",
  a: "RepoDNA uses Google's Gemini for chat and analyses. Every AI response is grounded in the repository's README, tree, and metadata to minimize hallucinations."
}, {
  q: "Do you support private repositories?",
  a: "Yes. Add a GitHub Personal Access Token in Settings — it's stored in your account settings and used by our API on your behalf."
}, {
  q: "Where is my data stored?",
  a: "Your account, saved repos, chats, and AI outputs live in MongoDB, scoped to your user ID. Each repository call goes directly to api.github.com through our API."
}];
export default function Landing() {
  const [repoUrl, setRepoUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const nav = useNavigate();
  const {
    user
  } = useAuth();
  const analyze = async () => {
    const parsed = parseGithubUrl(repoUrl);
    if (!parsed) return toast.error("Enter a valid GitHub repository URL", {
      description: "Example: https://github.com/vercel/next.js or vercel/next.js"
    });
    setBusy(true);
    try {
      const repo = await fetchRepo(parsed.owner, parsed.name);
      if (user) {
        await upsertRepo({
          id: idOf(repo.owner.login, repo.name),
          owner: repo.owner.login,
          name: repo.name,
          fullName: repo.full_name,
          description: repo.description,
          language: repo.language,
          ownerAvatar: repo.owner.avatar_url,
          stars: repo.stargazers_count,
          addedAt: new Date().toISOString()
        });
        toast.success("Repository saved", {
          description: repo.full_name
        });
        nav(`/app/repo/${idOf(repo.owner.login, repo.name)}`);
      } else {
        toast.info("Sign in to unlock AI analysis", {
          description: "Repos are saved to your workspace."
        });
        nav(`/signup`);
      }
    } catch (e) {
      toast.error("Could not fetch repository", {
        description: e.message
      });
    } finally {
      setBusy(false);
    }
  };
  return <div className="relative">
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[680px] noise opacity-40" />
      <Navbar />

      <section className="relative mx-auto max-w-7xl px-4 pb-16 pt-14 sm:px-6 sm:pt-20 lg:px-8">
        <div className="grid items-center gap-12 lg:grid-cols-[1.1fr_1fr]">
          <div>
            <span className="badge-soft">
              <span className="h-1.5 w-1.5 rounded-full bg-olive anim-pulse-soft" />
              Powered by Google Gemini
            </span>
            <h1 className="mt-5 font-serif text-5xl leading-[1.02] tracking-tight text-balance sm:text-6xl lg:text-[76px]">
              Understand any
              <span className="mx-2 inline-block rotate-[-1.5deg] rounded-2xl bg-olive px-3 py-1 text-cream shadow-[0_10px_30px_-15px_hsla(71,34%,20%,0.6)]">
                codebase
              </span>
              in minutes,
              <span className="italic text-olive-dark"> not weeks.</span>
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-foreground/75">
              RepoDNA AI turns every GitHub repository into an interactive knowledge system —
              architecture graphs, grounded RAG chat, automated docs, and contributor intelligence in one
              platform.
            </p>

            <div className="mt-8 glass flex flex-col gap-2 rounded-2xl p-2 sm:flex-row sm:items-center">
              <div className="flex flex-1 items-center gap-2 rounded-xl bg-cream px-3 py-2">
                <Github className="h-4 w-4 text-muted-foreground" />
                <input value={repoUrl} onChange={e => setRepoUrl(e.target.value)} onKeyDown={e => {
                if (e.key === "Enter") analyze();
              }} className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground" placeholder="https://github.com/owner/repository" />
              </div>
              <button className="btn-primary" onClick={analyze} disabled={busy}>
                {busy ? "Fetching…" : "Analyze"}
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 font-mono text-[11px] text-muted-foreground">
              <span>Try:</span>
              {["vercel/next.js", "facebook/react", "microsoft/vscode"].map(s => <button key={s} onClick={() => setRepoUrl(`https://github.com/${s}`)} className="link-underline hover:text-foreground">
                  {s}
                </button>)}
            </div>

            <div className="mt-9 flex items-center gap-3">
              <Link to={user ? "/app" : "/signup"} className="btn-gold">
                {user ? "Open workspace" : "Create a workspace"} <ArrowRight className="h-4 w-4" />
              </Link>
              <a href="#how" className="btn-ghost">
                <Sparkles className="h-4 w-4" /> How it works
              </a>
            </div>
          </div>

          <motion.div initial={{
          opacity: 0,
          y: 24
        }} animate={{
          opacity: 1,
          y: 0
        }} transition={{
          duration: 0.9
        }}>
            <HeroVisual />
          </motion.div>
        </div>
      </section>

      <section id="features" className="relative mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <div className="font-mono text-[10px] uppercase tracking-[0.28em] text-olive">The platform</div>
          <h2 className="mt-3 font-serif text-4xl leading-tight tracking-tight sm:text-5xl">
            Eight lenses. <span className="italic text-olive-dark">One repository truth.</span>
          </h2>
          <p className="mt-4 text-foreground/70">
            Every RepoDNA panel is cross-linked. Ask a question in chat → jump to the file → open its
            architecture context → generate its docs. All grounded in a single knowledge graph.
          </p>
        </div>

        <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((f, i) => <motion.div key={f.title} initial={{
          opacity: 0,
          y: 20
        }} whileInView={{
          opacity: 1,
          y: 0
        }} viewport={{
          once: true,
          margin: "-80px"
        }} transition={{
          duration: 0.5,
          delay: i * 0.04
        }} className="group relative overflow-hidden rounded-2xl border border-border/70 bg-cream/70 p-6 transition hover:-translate-y-1 hover:border-olive/40 hover:shadow-lg">
              <div className={`mb-5 inline-flex h-10 w-10 items-center justify-center rounded-xl ${f.tone === "olive" ? "bg-olive text-cream" : "bg-gold text-charcoal"}`}>
                <f.icon className="h-5 w-5" />
              </div>
              <h3 className="font-serif text-lg font-semibold tracking-tight">{f.title}</h3>
              <p className="mt-2 text-sm text-foreground/70">{f.desc}</p>
              <div className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-gold/10 blur-2xl transition group-hover:bg-olive/20" />
            </motion.div>)}
        </div>
      </section>

      <section id="how" className="mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8">
        <div className="grid gap-12 lg:grid-cols-[1fr_1.15fr]">
          <div className="lg:sticky lg:top-28 lg:h-fit">
            <div className="font-mono text-[10px] uppercase tracking-[0.28em] text-olive">How it works</div>
            <h2 className="mt-3 font-serif text-4xl leading-tight tracking-tight sm:text-5xl">
              From a URL to a complete <em className="text-olive-dark">mental model</em>
            </h2>
            <p className="mt-4 text-foreground/70">
              RepoDNA fetches every public artifact GitHub exposes and layers grounded AI intelligence
              on top — chat, docs, security, tests, interviews, roadmaps, and more.
            </p>
            <div className="mt-6 flex flex-wrap gap-2 font-mono text-[11px] text-foreground/70">
              {["Gemini AI", "GitHub REST", "MongoDB", "Node + Express"].map(t => <span key={t} className="badge-soft">{t}</span>)}
            </div>
          </div>

          <ol className="relative space-y-6 border-l border-border pl-8">
            {STEPS.map(s => <li key={s.n} className="relative">
                <span className="absolute -left-[42px] top-1 flex h-8 w-8 items-center justify-center rounded-full border border-olive/40 bg-cream font-mono text-xs font-semibold text-olive-dark">
                  {s.n}
                </span>
                <div className="glass rounded-2xl p-5">
                  <h3 className="font-serif text-xl font-semibold tracking-tight">{s.title}</h3>
                  <p className="mt-1.5 text-sm text-foreground/70">{s.desc}</p>
                </div>
              </li>)}
          </ol>
        </div>
      </section>

      <section id="faq" className="mx-auto max-w-4xl px-4 py-24 sm:px-6 lg:px-8">
        <div className="text-center">
          <div className="font-mono text-[10px] uppercase tracking-[0.28em] text-olive">FAQ</div>
          <h2 className="mt-3 font-serif text-4xl leading-tight tracking-tight sm:text-5xl">
            Everything you were about to ask.
          </h2>
        </div>
        <div className="mt-10 divide-y divide-border/70 rounded-2xl border border-border/70 bg-cream/70">
          {FAQ.map(f => <details key={f.q} className="group px-6 py-5 [&_summary::-webkit-details-marker]:hidden">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-6 text-left font-serif text-lg font-semibold">
                {f.q}
                <span className="grid h-8 w-8 place-items-center rounded-full border border-border/70 text-lg leading-none transition group-open:rotate-45">+</span>
              </summary>
              <p className="mt-3 max-w-3xl text-sm text-foreground/75">{f.a}</p>
            </details>)}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-24 sm:px-6 lg:px-8">
        <div className="relative overflow-hidden rounded-3xl bg-olive px-8 py-16 text-cream shadow-xl">
          <div className="absolute inset-0 grid-lines opacity-[0.08]" />
          <div className="relative grid items-center gap-8 md:grid-cols-[1.4fr_1fr]">
            <div>
              <div className="font-mono text-[10px] uppercase tracking-[0.28em] text-gold">Ready when you are</div>
              <h3 className="mt-3 font-serif text-4xl leading-tight tracking-tight sm:text-5xl">
                Turn your next repository into a knowledge system.
              </h3>
              <p className="mt-4 max-w-xl text-cream/85">
                Free to start. Add a GitHub token to unlock private repos and higher rate limits.
              </p>
            </div>
            <div className="flex flex-col items-start gap-3 md:items-end">
              <Link to={user ? "/app" : "/signup"} className="btn-gold">
                {user ? "Open workspace" : "Start analyzing"} <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>;
}