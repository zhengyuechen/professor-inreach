import { setTimeout as delay } from "node:timers/promises";

export class ServiceError extends Error {
  /** Carry a safe, actionable error without exposing request credentials. */
  constructor(public code: string, message: string) { super(message); }
}

export type JsonGetter = (url: URL, headers?: Record<string, string>) => Promise<unknown>;

/** Fetch bounded JSON from a fixed provider and retry one transient failure. */
export async function getJson(url: URL, headers: Record<string, string> = {}): Promise<unknown> {
  for (let attempt = 0; attempt < 2; attempt++) {
    let response: Response;
    try {
      response = await fetch(url, {
        headers: { Accept: "application/json", "User-Agent": "ProfessorInReach/0.1", ...headers },
        signal: AbortSignal.timeout(15_000), redirect: "error",
      });
    } catch {
      throw new ServiceError("provider_unavailable", "The research provider could not be reached. Retry shortly.");
    }
    if ((response.status === 429 || response.status >= 500) && attempt === 0) {
      await response.body?.cancel();
      await delay(750);
      continue;
    }
    if (response.status === 429) {
      await response.body?.cancel();
      throw new ServiceError("rate_limited", "The provider's request budget is exhausted. Retry later or configure a provider key.");
    }
    if (!response.ok) {
      await response.body?.cancel();
      throw new ServiceError("provider_error", `The research provider returned HTTP ${response.status}.`);
    }
    if (!response.body) throw new ServiceError("empty_response", "The provider returned an empty response.");
    const reader = response.body.getReader();
    const chunks: Uint8Array[] = [];
    let size = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 12_000_000) {
        await reader.cancel();
        throw new ServiceError("response_too_large", "The provider response was too large; narrow the topic.");
      }
      chunks.push(value);
    }
    try { return JSON.parse(Buffer.concat(chunks).toString("utf8")); }
    catch { throw new ServiceError("invalid_response", "The provider did not return valid JSON."); }
  }
  throw new ServiceError("provider_unavailable", "The research provider is unavailable.");
}
