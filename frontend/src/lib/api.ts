import { storage } from "@/src/utils/storage";

const BASE = process.env.EXPO_PUBLIC_PHARMA_API_URL as string;
export const SITE_ORIGIN = BASE.replace(/\/api\/?$/, "");
const TOKEN_KEY = "pharma_token";

let memToken: string | null = null;

export async function getToken(): Promise<string | null> {
  if (memToken) return memToken;
  memToken = await storage.secureGet<string>(TOKEN_KEY, "");
  return memToken || null;
}
export async function setToken(t: string | null) {
  memToken = t;
  if (t) await storage.secureSet(TOKEN_KEY, t);
  else await storage.secureRemove(TOKEN_KEY);
}

export function mediaUrl(path?: string | null): string | undefined {
  if (!path) return undefined;
  if (path.startsWith("http")) return path;
  if (path.startsWith("/")) return SITE_ORIGIN + path;
  return path;
}

type Opts = { method?: string; body?: any; auth?: boolean; query?: Record<string, any> };

function qs(query?: Record<string, any>) {
  if (!query) return "";
  const parts = Object.entries(query)
    .filter(([, v]) => v !== undefined && v !== null && v !== "")
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`);
  return parts.length ? "?" + parts.join("&") : "";
}

async function buildHeaders(auth: boolean, hasBody: boolean) {
  const h: Record<string, string> = { Accept: "application/json" };
  if (hasBody) h["Content-Type"] = "application/json";
  const t = await getToken();
  if (t) h["Authorization"] = `Bearer ${t}`;
  return h;
}

async function core(path: string, opts: Opts = {}): Promise<Response> {
  const url = BASE + path + qs(opts.query);
  const headers = await buildHeaders(!!opts.auth, opts.body !== undefined);
  return fetch(url, {
    method: opts.method || "GET",
    headers,
    credentials: "include",
    cache: "no-store",
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
  });
}

async function parse(res: Response) {
  const text = await res.text();
  let data: any = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  if (!res.ok) {
    const detail = data && (data.detail || data.message);
    const msg = typeof detail === "string" ? detail : Array.isArray(detail) ? detail[0]?.msg : "Une erreur est survenue";
    const err: any = new Error(msg || "Une erreur est survenue");
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

// captures the JWT set as a cookie (works on native where set-cookie is exposed)
function captureCookieToken(res: Response) {
  try {
    const sc = res.headers.get("set-cookie");
    if (sc) {
      const m = sc.match(/access_token=([^;]+)/);
      if (m && m[1]) setToken(m[1]);
    }
  } catch {}
}

export const api = {
  async get(path: string, query?: Record<string, any>, auth = false) {
    return parse(await core(path, { query, auth }));
  },
  async post(path: string, body?: any, auth = false) {
    const res = await core(path, { method: "POST", body, auth });
    captureCookieToken(res);
    return parse(res);
  },
  async put(path: string, body?: any, auth = true) {
    return parse(await core(path, { method: "PUT", body, auth }));
  },
  async del(path: string, auth = true) {
    return parse(await core(path, { method: "DELETE", auth }));
  },
};
