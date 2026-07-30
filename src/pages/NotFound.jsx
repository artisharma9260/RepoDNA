import { Link } from "react-router-dom";
import Logo from "@/components/branding/Logo";
export default function NotFound() {
  return <div className="min-h-screen paper">
      <div className="mx-auto flex min-h-screen max-w-5xl flex-col px-6 py-8">
        <Logo />
        <div className="flex flex-1 flex-col items-center justify-center text-center">
          <div className="font-mono text-[10px] uppercase tracking-[0.28em] text-olive">Error 404</div>
          <h1 className="mt-4 font-serif text-6xl font-semibold tracking-tight sm:text-8xl">
            Missing <span className="italic text-olive-dark">gene sequence.</span>
          </h1>
          <p className="mt-4 max-w-lg text-foreground/70">
            The strand you were looking for doesn't exist in this repository's DNA. Head back home to
            analyze a new repository.
          </p>
          <div className="mt-8 flex gap-3">
            <Link to="/" className="btn-primary">Back to home</Link>
            <Link to="/app" className="btn-ghost">Go to dashboard</Link>
          </div>
        </div>
      </div>
    </div>;
}