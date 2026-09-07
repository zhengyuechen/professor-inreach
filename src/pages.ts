import { lookup } from "node:dns/promises";
import { request } from "node:https";
import { isIP } from "node:net";
import ipaddr from "ipaddr.js";
import { load } from "cheerio";
import { ServiceError } from "./api.js";
import type { PageEvidence } from "./types.js";

/** Allow only globally routable unicast addresses, including mapped IPv4 checks. */
export function isPublicAddress(address: string): boolean {
  try { return ipaddr.process(address).range() === "unicast"; }
  catch { return false; }
}

/** Require a credential-free HTTPS hostname on the standard public web port. */
export function validatePageUrl(raw: string): URL {
  let url: URL;
  try { url = new URL(raw); } catch { throw new ServiceError("invalid_url", "Provide a complete public HTTPS page URL."); }
  if (url.protocol !== "https:" || url.username || url.password || (url.port && url.port !== "443")) {
    throw new ServiceError("invalid_url", "Only public HTTPS URLs without embedded credentials are supported.");
  }
  const host = url.hostname.replace(/\.$/, "");
  if (!host.includes(".") || isIP(host.replace(/^\[|\]$/g, "")) || /\.(localhost|local|internal|test|invalid|onion)$/i.test(host)) {
    throw new ServiceError("private_url", "Local, internal, and IP-address URLs are not supported.");
  }
  url.hash = "";
  return url;
}

type PublicResponse = { status: number; location?: string; contentType: string; body: string };

/** Pin the connection to a validated public DNS address while verifying the original TLS hostname. */
async function fetchOnce(url: URL): Promise<PublicResponse> {
  let addresses;
  try { addresses = await lookup(url.hostname, { all: true }); }
  catch { throw new ServiceError("page_unavailable", "The page hostname could not be resolved."); }
  if (!addresses.length || addresses.some(a => !isPublicAddress(a.address))) {
    throw new ServiceError("private_url", "The page resolves to a non-public network address.");
  }
  const address = addresses[0]!;
  return new Promise((resolve, reject) => {
    const req = request({
      hostname: address.address, family: address.family, servername: url.hostname,
      port: 443, path: url.pathname + url.search, method: "GET", agent: false,
      headers: { Host: url.host, "User-Agent": "ProfessorInReach/0.1 (public academic research)", Accept: "text/html,text/plain", "Accept-Encoding": "identity" },
    }, res => {
      const status = res.statusCode ?? 500;
      const contentType = res.headers["content-type"] ?? "";
      if (status >= 300 && status < 400) {
        res.resume();
        resolve({ status, location: res.headers.location, contentType, body: "" });
        return;
      }
      if (status !== 200 || !/^(text\/html|text\/plain|application\/xhtml\+xml)(;|$)/i.test(contentType)) {
        res.resume();
        reject(new ServiceError("page_unavailable", status !== 200 ? `The page returned HTTP ${status}; use another official source.` : "This reader supports HTML and text. Open PDFs or dynamic pages in ChatGPT instead."));
        return;
      }
      const chunks: Buffer[] = [];
      let size = 0;
      res.on("data", (chunk: Buffer) => {
        size += chunk.length;
        if (size > 2_000_000) req.destroy(new ServiceError("page_too_large", "The page exceeds the reader's size limit."));
        else chunks.push(chunk);
      });
      res.on("end", () => resolve({ status, contentType, body: Buffer.concat(chunks).toString("utf8") }));
      res.on("error", reject);
    });
    const timer = setTimeout(() => req.destroy(new ServiceError("page_timeout", "The page took too long to respond.")), 10_000);
    req.on("close", () => clearTimeout(timer));
    req.on("error", error => reject(error instanceof ServiceError ? error : new ServiceError("page_unavailable", "The page could not be securely retrieved.")));
    req.end();
  });
}

/** Normalize whitespace for readable page excerpts and quote matching. */
export function normalizeText(value: string): string {
  return value.normalize("NFKC").replace(/\s+/gu, " ").trim();
}

/** Extract visible page text, public email links, and likely next research pages. */
export function extractPage(html: string, url: string, plain = false): PageEvidence {
  const $ = load(plain ? "" : html);
  const title = plain ? "Text source" : normalizeText($("title").first().text());
  $("script,style,noscript,svg,iframe,template,[hidden],[aria-hidden='true']").remove();
  $("[style]").each((_, element) => {
    if (/display\s*:\s*none|visibility\s*:\s*hidden/i.test($(element).attr("style") ?? "")) $(element).remove();
  });
  const emails = new Set<string>();
  const links: PageEvidence["links"] = [];
  $("a[href]").each((_, element) => {
    const href = $(element).attr("href") ?? "";
    if (href.startsWith("mailto:")) {
      const address = href.slice(7).split("?")[0];
      if (address && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(address)) emails.add(address);
      return;
    }
    try {
      const target = new URL(href, url);
      const label = normalizeText($(element).text()).slice(0, 160);
      if (target.protocol === "https:" && /people|member|team|group|join|position|openings|recruit|student|research|publications|faculty|contact/i.test(label + target.pathname)) {
        if (!links.some(link => link.url === target.href)) links.push({ label, url: target.href });
      }
    } catch { /* Ignore malformed links in untrusted pages. */ }
  });
  $("br").replaceWith("\n");
  $("h1,h2,h3,h4,p,li,tr,section,article").each((_, element) => { $(element).append("\n"); });
  const text = plain ? html : $("body").text();
  const cleaned = text.split("\n").map(normalizeText).filter(Boolean).join("\n");
  return {
    source_url: url, retrieved_at: new Date().toISOString(), title,
    text: cleaned.slice(0, 30_000), truncated: cleaned.length > 30_000,
    links: links.slice(0, 35), emails: [...emails].slice(0, 20), content_kind: "untrusted_public_webpage",
  };
}

/** Read a public page with bounded redirects and independent address checks at every hop. */
export async function readPage(raw: string): Promise<PageEvidence> {
  let url = validatePageUrl(raw);
  for (let redirects = 0; redirects <= 3; redirects++) {
    const response = await fetchOnce(url);
    if (response.status >= 300 && response.status < 400) {
      if (!response.location) throw new ServiceError("page_unavailable", "The page returned a redirect without a destination.");
      url = validatePageUrl(new URL(response.location, url).href);
      continue;
    }
    return extractPage(response.body, url.href, response.contentType.startsWith("text/plain"));
  }
  throw new ServiceError("too_many_redirects", "The page redirected too many times; use its final official URL.");
}
