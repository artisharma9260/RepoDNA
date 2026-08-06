import { apiClient, setToken } from "@/lib/apiClient";
function extractError(e, fallback) {
  const message = e?.response?.data?.error ?? e?.message ?? fallback;
  return new Error(message);
}
export const authService = {
  async signUp(name, email, password) {
    try {
      const res = await apiClient.post("/auth/signup", {
        name,
        email,
        password
      });
      setToken(res.data.token);
      return res.data.user;
    } catch (e) {
      throw extractError(e, "Could not create account");
    }
  },
  async signInWithPassword(email, password) {
    try {
      const res = await apiClient.post("/auth/login", {
        email,
        password
      });
      setToken(res.data.token);
      return res.data.user;
    } catch (e) {
      throw extractError(e, "Invalid email or password");
    }
  },
  async signOut() {
    try {
      await apiClient.post("/auth/logout");
    } finally {
      setToken(null);
    }
  },
  async getMe() {
    try {
      const res = await apiClient.get("/auth/me");
      return res.data.user;
    } catch {
      return null;
    }
  },
  async updateProfile(patch) {
    const res = await apiClient.patch("/auth/me", patch);
    return res.data.user;
  }
};