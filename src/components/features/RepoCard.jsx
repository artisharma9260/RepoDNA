import { Link } from "react-router-dom";
import { ArrowUpRight, Star, Clock } from "lucide-react";
import { colorForLang } from "@/lib/github";
import { formatNumber, timeAgo } from "@/lib/utils";
export default function RepoCard({
  repo,
  featured
}) {
  return <Link to={`/app/repo/${repo.id}`} className={`group relative flex flex-col overflow-hidden rounded-2xl border border-border/70 bg-cream/70 p-5 transition hover:-translate-y-0.5 hover:border-olive/50 hover:shadow-lg ${featured ? "lg:col-span-2 bg-gradient-to-br from-cream-deep to-cream" : ""}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
            {repo.ownerAvatar && <img src={repo.ownerAvatar} alt={repo.owner} className="h-4 w-4 rounded-full" />}
            {repo.owner}
          </div>
          <div className="mt-1 flex items-center gap-2">
            <h3 className="truncate font-serif text-xl font-semibold tracking-tight">{repo.name}</h3>
            {repo.language && <>
                <span className="h-1.5 w-1.5 rounded-full" style={{
              background: colorForLang(repo.language)
            }} />
                <span className="font-mono text-[11px] text-muted-foreground">{repo.language}</span>
              </>}
          </div>
          {repo.description && <p className="mt-2 line-clamp-2 text-sm text-foreground/75">{repo.description}</p>}
        </div>
        <ArrowUpRight className="h-5 w-5 shrink-0 text-muted-foreground transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-foreground" />
      </div>

      <div className="mt-5 flex items-center justify-between border-t border-border/60 pt-3 text-[11px] text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <Star className="h-3 w-3" /> {typeof repo.stars === "number" ? formatNumber(repo.stars) : "—"}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <Clock className="h-3 w-3" /> Added {timeAgo(repo.addedAt)}
        </span>
      </div>
    </Link>;
}