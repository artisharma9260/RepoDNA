import { useEffect, useState } from "react";
import { listRepos, REPOS_CHANGED } from "@/lib/store";
import { useAuth } from "@/hooks/useAuth";
export function useAnalyzedRepos() {
  const {
    user
  } = useAuth();
  const [repos, setRepos] = useState([]);
  const [loading, setLoading] = useState(true);
  const refresh = () => {
    if (!user) {
      setRepos([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    listRepos().then(setRepos).catch(() => setRepos([])).finally(() => setLoading(false));
  };
  useEffect(() => {
    refresh();
    const on = () => refresh();
    window.addEventListener(REPOS_CHANGED, on);
    return () => window.removeEventListener(REPOS_CHANGED, on);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);
  return {
    repos,
    loading,
    refresh
  };
}
export { useAuth as useCurrentUser } from "@/hooks/useAuth";