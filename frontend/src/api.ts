import type {
  DeleteTurnRequest,
  MergeTurnsRequest,
  SessionsResponse,
  TurnsResponse,
} from "./types";

const apiBase = (import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:3000").replace(/\/$/, "");

async function requestJson<T>(path: string, init: RequestInit = {}): Promise<T> {
  const requestUrl = `${apiBase}${path}`;
  let response: Response;
  const headers = new Headers(init.headers);

  if (!headers.has("Accept")) {
    headers.set("Accept", "application/json");
  }

  try {
    response = await fetch(requestUrl, {
      ...init,
      headers,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "未知网络错误";
    throw new Error(`请求接口失败：${requestUrl}。请确认后端服务已启动。底层原因：${message}`);
  }

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `请求失败：${requestUrl} 返回 HTTP ${response.status}`);
  }

  return response.json() as Promise<T>;
}

export async function fetchSessions() {
  return requestJson<SessionsResponse>("/api/sessions");
}

export async function fetchSessionTurns(sessionKey: string) {
  return requestJson<TurnsResponse>(`/api/sessions/${encodeURIComponent(sessionKey)}/turns`);
}

export async function mergeSessionTurns(sessionKey: string, payload: MergeTurnsRequest) {
  return requestJson<TurnsResponse>(`/api/sessions/${encodeURIComponent(sessionKey)}/turns/merge`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
}

export async function deleteSessionTurn(sessionKey: string, payload: DeleteTurnRequest) {
  return requestJson<TurnsResponse>(`/api/sessions/${encodeURIComponent(sessionKey)}/turns/delete`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
}

export function getApiBase() {
  return apiBase;
}
