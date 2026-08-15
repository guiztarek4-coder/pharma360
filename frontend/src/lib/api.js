import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
export const API = `${BACKEND_URL}/api`;

const api = axios.create({
  baseURL: API,
  withCredentials: true,
});

export const PLACEHOLDER = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='300'%3E%3Crect width='300' height='300' fill='%23ECFDF5'/%3E%3Ctext x='50%25' y='50%25' font-size='18' fill='%2310B981' text-anchor='middle' dy='.3em' font-family='sans-serif'%3EPharma360%3C/text%3E%3C/svg%3E";

export const mediaUrl = (path) => {
  if (!path) return PLACEHOLDER;
  if (path.startsWith("http")) return path;
  return `${BACKEND_URL}${path}`;
};

export const formatDA = (n) => {
  const val = Math.round(Number(n) || 0);
  return `${val.toLocaleString("fr-FR").replace(/\u202f|\u00a0/g, " ")} DA`;
};

export const formatApiError = (detail) => {
  if (detail == null) return "Une erreur est survenue. Réessayez.";
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail))
    return detail.map((e) => (e && typeof e.msg === "string" ? e.msg : JSON.stringify(e))).filter(Boolean).join(" ");
  if (detail && typeof detail.msg === "string") return detail.msg;
  return String(detail);
};

export default api;
