// Browser-side helper for calling the app's JSON APIs with consistent error handling.

export interface ApiResult<T> {
  ok: boolean;
  status: number;
  data?: T;
  error?: string;
  fields?: Record<string, string>;
}

export async function api<T = unknown>(url: string, opts: { method?: string; body?: unknown; headers?: Record<string, string> } = {}): Promise<ApiResult<T>> {
  try {
    const res = await fetch(url, {
      method: opts.method ?? (opts.body === undefined ? "GET" : "POST"),
      headers: { ...(opts.body !== undefined && !(opts.body instanceof FormData) ? { "Content-Type": "application/json" } : {}), ...opts.headers },
      body: opts.body === undefined ? undefined : opts.body instanceof FormData ? opts.body : JSON.stringify(opts.body),
    });
    const json = await res.json().catch(() => null);
    if (!res.ok) {
      return { ok: false, status: res.status, error: json?.error ?? `Request failed (${res.status}).`, fields: json?.fields };
    }
    return { ok: true, status: res.status, data: json as T };
  } catch {
    return { ok: false, status: 0, error: "Network problem. Check your connection and try again." };
  }
}
