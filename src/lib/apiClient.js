import axios from "axios";
// export const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8787/api";
export const API_URL = "https://repodna.onrender.com/api";

console.log("API_URL =", API_URL);
const TOKEN_KEY = "repodna_token";
export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}
export function setToken(token) {
  if (token) localStorage.setItem(TOKEN_KEY, token);else localStorage.removeItem(TOKEN_KEY);
}
export const apiClient = axios.create({
  baseURL: API_URL
});
apiClient.interceptors.request.use(config => {
  const token = getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});