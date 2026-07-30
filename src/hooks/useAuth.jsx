import { createContext, useContext, useEffect, useState } from "react";
import { getToken } from "@/lib/apiClient";
import { authService } from "@/lib/auth";
const Ctx = createContext({
  user: null,
  loading: true,
  setUser: () => {}
});
export function AuthProvider({
  children
}) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let mounted = true;
    (async () => {
      const token = getToken();
      if (!token) {
        if (mounted) setLoading(false);
        return;
      }
      const me = await authService.getMe();
      if (!mounted) return;
      setUser(me);
      setLoading(false);
    })();
    return () => {
      mounted = false;
    };
  }, []);
  return <Ctx.Provider value={{
    user,
    loading,
    setUser
  }}>{children}</Ctx.Provider>;
}
export function useAuth() {
  return useContext(Ctx);
}