import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Building2, GitBranch, Star, Users2, ShieldCheck, Gauge, TrendingUp, ArrowRight, Database, Layers, Trophy } from "lucide-react";
import { useAnalyzedRepos } from "@/hooks/useStore";
import { db } from "@/lib/db";
import { colorForLang } from "@/lib/github";
import { formatNumber } from "@/lib/utils";
import { cn } from "@/lib/utils";
export default function Enterprise() {
  const {
    repos
  } = useAnalyzedRepos();
  const [health, setHealth] = useState({});
  const [ingest, setIngest] = useState({});
  useEffect(() => {
    (async () => {
      const [h, i] = await Promise.all([db.from("repo_health").select("repo_id,overall,scores"), db.from("repo_ingestions").select("repo_id,status,indexed_files")]);
      const hm = {};
      h.data?.forEach(r => hm[r.repo_id] = r);
      const im = {};
      i.data?.forEach(r => im[r.repo_id] = r);
      setHealth(hm);
      setIngest(im);
    })();
  }, [repos.length]);
  const stats = useMemo(() => {
    const stars = repos.reduce((a, r) => a + (r.stars ?? 0), 0);
    const scoredRepos = repos.filter(r => health[r.id]);
    const avg = scoredRepos.length ? Math.round(scoredRepos.reduce((a, r) => a + (health[r.id]?.overall ?? 0), 0) / scoredRepos.length) : null;
    const indexed = Object.values(ingest).filter(i => i.status === "ready").length;
    const langs = new Map();
    repos.forEach(r => {
      if (r.language) langs.set(r.language, (langs.get(r.language) ?? 0) + 1);
    });
    const langList = Array.from(langs.entries()).sort((a, b) => b[1] - a[1]);
    return {
      stars,
      avg,
      indexed,
      langList,
      scored: scoredRepos.length
    };
  }, [repos, health, ingest]);
  const ranked = useMemo(() => [...repos].sort((a, b) => (health[b.id]?.overall ?? -1) - (health[a.id]?.overall ?? -1)), [repos, health]);
  const riskiest = useMemo(() => [...repos].filter(r => health[r.id]).sort((a, b) => (health[a.id]?.scores?.security ?? 100) - (health[b.id]?.scores?.security ?? 100)).slice(0, 5), [repos, health]);
  return <div className="space-y-8">
      <div>
        <div className="font-mono text-[10px] uppercase tracking-[0.28em] text-olive">Enterprise analytics</div>
        <h1 className="mt-2 font-serif text-4xl font-semibold tracking-tight">Organization dashboard</h1>
        <p className="text-sm text-muted-foreground">Multi-repository overview · comparison · risk · technology distribution.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatBlock label="Indexed repos" value={String(repos.length)} icon={Building2} sub={`${stats.indexed} RAG-ready`} />
        <StatBlock label="Aggregate stars" value={formatNumber(stats.stars)} icon={Star} />
        <StatBlock label="Avg health" value={stats.avg == null ? "—" : `${stats.avg}/100`} icon={Gauge} sub={`${stats.scored} scored`} />
        <StatBlock label="Technologies" value={String(stats.langList.length)} icon={Layers} sub={stats.langList[0]?.[0] ?? "n/a"} />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
        <div className="glass rounded-2xl p-6">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="font-serif text-xl font-semibold tracking-tight">Repository leaderboard</h3>
              <p className="text-xs text-muted-foreground">Ranked by overall health score.</p>
            </div>
            <Trophy className="h-5 w-5 text-gold" />
          </div>
          {repos.length === 0 ? <div className="rounded-xl border border-border/70 bg-cream-deep/40 p-4 text-sm text-muted-foreground">
              No repositories indexed yet.
            </div> : <table className="w-full text-sm">
              <thead>
                <tr className="text-left font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                  <th className="py-2">Repository</th>
                  <th>Lang</th>
                  <th>Stars</th>
                  <th>RAG</th>
                  <th>Health</th>
                  <th className="text-right">Open</th>
                </tr>
              </thead>
              <tbody>
                {ranked.map(r => {
              const h = health[r.id];
              const rag = ingest[r.id]?.status;
              return <tr key={r.id} className="border-t border-border/70">
                      <td className="py-2.5 pr-2">
                        <div className="flex items-center gap-2">
                          {r.ownerAvatar ? <img src={r.ownerAvatar} alt="" className="h-5 w-5 rounded-full" /> : <span className="h-5 w-5 rounded-full bg-cream-deep" />}
                          <div className="truncate">
                            <div className="truncate font-medium">{r.fullName}</div>
                            <div className="line-clamp-1 text-xs text-muted-foreground">{r.description ?? "—"}</div>
                          </div>
                        </div>
                      </td>
                      <td>
                        {r.language ? <span className="inline-flex items-center gap-1.5 text-xs">
                            <span className="h-2 w-2 rounded-full" style={{
                      background: colorForLang(r.language)
                    }} />
                            {r.language}
                          </span> : "—"}
                      </td>
                      <td className="font-mono text-xs">{formatNumber(r.stars ?? 0)}</td>
                      <td>
                        <span className={cn("rounded-full px-2 py-0.5 font-mono text-[10px]", rag === "ready" ? "bg-olive/15 text-olive-dark" : rag === "running" ? "bg-gold/20 text-charcoal" : "bg-cream-deep text-muted-foreground")}>{rag ?? "none"}</span>
                      </td>
                      <td>
                        {h ? <div className="flex items-center gap-2">
                            <div className="h-1.5 w-16 overflow-hidden rounded-full bg-cream">
                              <span className="block h-full bg-olive" style={{
                        width: `${h.overall}%`
                      }} />
                            </div>
                            <span className="font-mono text-xs">{h.overall}</span>
                          </div> : <span className="text-xs text-muted-foreground">—</span>}
                      </td>
                      <td className="text-right">
                        <Link to={`/app/repo/${r.id}`} className="inline-flex items-center gap-1 text-xs text-olive-dark hover:underline">
                          Open <ArrowRight className="h-3 w-3" />
                        </Link>
                      </td>
                    </tr>;
            })}
              </tbody>
            </table>}
        </div>

        <div className="space-y-6">
          <div className="glass rounded-2xl p-6">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-serif text-lg font-semibold tracking-tight">Technology distribution</h3>
              <Database className="h-4 w-4 text-olive" />
            </div>
            {stats.langList.length === 0 ? <div className="text-sm text-muted-foreground">No languages tracked.</div> : <ul className="space-y-2">
                {stats.langList.slice(0, 8).map(([lang, count]) => {
              const pct = Math.round(count / repos.length * 100);
              return <li key={lang}>
                      <div className="flex items-center justify-between text-xs">
                        <span className="flex items-center gap-2">
                          <span className="h-2 w-2 rounded-full" style={{
                      background: colorForLang(lang)
                    }} />
                          {lang}
                        </span>
                        <span className="font-mono text-muted-foreground">{count} · {pct}%</span>
                      </div>
                      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-cream-deep">
                        <span className="block h-full rounded-full" style={{
                    width: `${pct}%`,
                    background: colorForLang(lang)
                  }} />
                      </div>
                    </li>;
            })}
              </ul>}
          </div>

          <div className="glass rounded-2xl p-6">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-serif text-lg font-semibold tracking-tight">Highest security risk</h3>
              <ShieldCheck className="h-4 w-4 text-destructive" />
            </div>
            {riskiest.length === 0 ? <div className="text-sm text-muted-foreground">Score at least one repository to see risk rankings.</div> : <ul className="space-y-2">
                {riskiest.map(r => {
              const sec = health[r.id]?.scores?.security ?? 0;
              return <li key={r.id} className="flex items-center justify-between rounded-xl border border-border/70 bg-cream-deep/40 px-3 py-2 text-sm">
                      <Link to={`/app/repo/${r.id}/security`} className="truncate font-medium hover:underline">{r.fullName}</Link>
                      <span className={cn("rounded-full px-2 py-0.5 font-mono text-[10px]", sec < 50 ? "bg-destructive/15 text-destructive" : sec < 70 ? "bg-gold/20 text-charcoal" : "bg-olive/15 text-olive-dark")}>{sec}/100</span>
                    </li>;
            })}
              </ul>}
          </div>

          <div className="glass rounded-2xl p-6">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-serif text-lg font-semibold tracking-tight">Productivity signals</h3>
              <TrendingUp className="h-4 w-4 text-olive" />
            </div>
            <ul className="space-y-2 text-sm">
              <li className="flex items-center justify-between rounded-lg bg-cream-deep/40 px-3 py-2">
                <span className="flex items-center gap-2"><GitBranch className="h-3.5 w-3.5 text-olive" /> Indexed</span>
                <span className="font-mono text-xs">{stats.indexed} / {repos.length}</span>
              </li>
              <li className="flex items-center justify-between rounded-lg bg-cream-deep/40 px-3 py-2">
                <span className="flex items-center gap-2"><Gauge className="h-3.5 w-3.5 text-olive" /> Scored</span>
                <span className="font-mono text-xs">{stats.scored} / {repos.length}</span>
              </li>
              <li className="flex items-center justify-between rounded-lg bg-cream-deep/40 px-3 py-2">
                <span className="flex items-center gap-2"><Users2 className="h-3.5 w-3.5 text-olive" /> Distinct owners</span>
                <span className="font-mono text-xs">{new Set(repos.map(r => r.owner)).size}</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>;
}
function StatBlock({
  label,
  value,
  icon: Icon,
  sub
}) {
  return <div className="glass rounded-2xl p-5">
      <div className="flex items-center justify-between">
        <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">{label}</div>
        <Icon className="h-4 w-4 text-olive" />
      </div>
      <div className="mt-2 font-serif text-3xl font-semibold tracking-tight">{value}</div>
      {sub && <div className="mt-1 text-xs text-muted-foreground">{sub}</div>}
    </div>;
}