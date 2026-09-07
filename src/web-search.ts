import { z } from "zod";
import { getJson, type JsonGetter } from "./api.js";

/** Locate public professor pages, or give a transparent fallback when no web-search key is configured. */
export async function searchWeb(query: string, key = "", json: JsonGetter = getJson) {
  if (!key) return {
    status: "not_configured", query, results: [],
    next_step: "Use ChatGPT's web search with this query, then read the official URLs with read_research_page. If web search is unavailable, ask for a faculty or lab URL. BRAVE_SEARCH_API_KEY enables this tool independently.",
  };
  const url = new URL("https://api.search.brave.com/res/v1/web/search");
  url.searchParams.set("q", query);
  url.searchParams.set("count", "8");
  const raw = await json(url, { "X-Subscription-Token": key });
  const result = z.object({ web: z.object({ results: z.array(z.object({ title: z.string(), url: z.string(), description: z.string().optional() })) }).optional() }).parse(raw);
  return {
    status: "ok", query, retrieved_at: new Date().toISOString(),
    results: result.web?.results.map(r => ({ title: r.title, url: r.url, snippet: r.description ?? "" })) ?? [],
    next_step: "Search snippets are leads, not verified evidence. Read the faculty or lab pages before making factual claims.",
  };
}
