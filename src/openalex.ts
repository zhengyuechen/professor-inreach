import { z } from "zod";
import { getJson, ServiceError, type JsonGetter } from "./api.js";
import { rankCandidates } from "./ranking.js";
import type { Candidate, Institution, Paper } from "./types.js";

const institutionSchema = z.object({ id: z.string(), display_name: z.string(), country_code: z.string().nullable().optional() });
const authorSchema = z.object({
  id: z.string(), display_name: z.string(),
  cited_by_count: z.number().nullable().optional(),
  summary_stats: z.object({ h_index: z.number().nullable().optional() }).nullable().optional(),
  last_known_institutions: z.array(institutionSchema).nullable().optional(),
  topics: z.array(z.object({ display_name: z.string() })).optional(),
  orcid: z.string().nullable().optional(),
});
const workSchema = z.object({
  id: z.string(), display_name: z.string().nullable(), publication_year: z.number().nullable(),
  doi: z.string().nullable().optional(), cited_by_count: z.number().nullable().optional(),
  primary_location: z.object({ landing_page_url: z.string().nullable().optional() }).nullable().optional(),
  authorships: z.array(z.object({
    author: z.object({ id: z.string().nullable(), display_name: z.string().nullable() }),
    institutions: z.array(institutionSchema).optional(),
  })).default([]),
});
type Work = z.infer<typeof workSchema>;
const authorFields = "id,display_name,cited_by_count,summary_stats,last_known_institutions,topics,orcid";
const workFields = "id,display_name,publication_year,doi,cited_by_count,primary_location,authorships";

/** Normalize an OpenAlex author identifier while rejecting arbitrary URLs and filters. */
export function authorId(value: string): string {
  const match = /^(?:https:\/\/openalex\.org\/)?(A\d+)$/.exec(value);
  if (!match?.[1]) throw new ServiceError("invalid_author_id", "Use an OpenAlex author ID such as A123 or its openalex.org URL.");
  return match[1];
}

/** Convert an institution into a compact, publication-derived affiliation. */
function institution(value: z.infer<typeof institutionSchema>): Institution {
  return { id: value.id, name: value.display_name, country: value.country_code ?? null };
}

/** Keep a link and citation count for a paper used in candidate discovery. */
function paper(work: Work): Paper {
  return {
    id: work.id, title: work.display_name ?? "Untitled work", year: work.publication_year,
    url: work.doi || work.primary_location?.landing_page_url || work.id,
    citations: work.cited_by_count ?? null,
  };
}

/** Measure literal topic overlap in a title as an explainable discovery heuristic. */
export function titleOverlap(topic: string, title: string): number {
  const stop = new Set(["the", "and", "for", "with", "from", "into", "of", "in", "on", "to"]);
  const terms = [...new Set(topic.toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? [])].filter(t => !stop.has(t));
  const words = new Set(title.toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? []);
  return terms.length ? terms.filter(term => words.has(term)).length / terms.length : 0;
}

/** Query OpenAlex without sending applicants' CVs or private project text. */
export class OpenAlex {
  /** Accept an optional provider credential and replaceable HTTP client for testing. */
  constructor(private key = "", private json: JsonGetter = getJson) {}

  /** Request a known OpenAlex endpoint with credentials confined to headers. */
  private async request(path: string, params: Record<string, string> = {}): Promise<unknown> {
    const url = new URL(`https://api.openalex.org/${path}`);
    for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
    return this.json(url, this.key ? { Authorization: `Bearer ${this.key}` } : {});
  }

  /** Retrieve an author record and recent papers while marking identity attribution for verification. */
  async researcher(id: string, topic?: string) {
    const normalized = authorId(id);
    const [rawAuthor, rawWorks] = await Promise.all([
      this.request(`authors/${normalized}`),
      this.request("works", {
        filter: `author.id:${normalized}`, sort: "publication_date:desc", per_page: "5", select: workFields,
        ...(topic ? { search: topic } : {}),
      }),
    ]);
    const author = authorSchema.parse(rawAuthor);
    const works = z.object({ results: z.array(workSchema) }).parse(rawWorks).results;
    return {
      id: author.id, name: author.display_name, orcid: author.orcid ?? null,
      institutions: (author.last_known_institutions ?? []).map(institution),
      citations: { count: author.cited_by_count ?? null, provider: "OpenAlex", source_url: author.id, retrieved_at: new Date().toISOString() },
      citation_attribution: "unverified_until_identity_checked",
      identity_review: (author.last_known_institutions?.length ?? 0) > 3 ? "Multiple institutions appear in this record; check for name conflation before attributing citations." : "Match this author record to the faculty page using papers and ORCID where available.",
      h_index: author.summary_stats?.h_index ?? null,
      research_topics: author.topics?.slice(0, 8).map(t => t.display_name) ?? [],
      recent_papers: works.map(paper),
      faculty_status: "unverified", academic_title: null, students: null, recruiting: "unknown",
      next_step: "Verify identity, current institution and faculty title on the university website; read lab people and recruiting pages.",
      affiliation_note: "Affiliations reflect recent indexed publications, not verified current employment.",
    };
  }

  /** Find author candidates from recent relevant papers and enrich bibliometrics in one batch. */
  async search(topic: string, countries: string[], since: number, limit: number, sort: "research_fit" | "citations" = "research_fit") {
    const raw = await this.request("works", {
      search: topic, filter: `from_publication_date:${since}-01-01`, per_page: "50", select: workFields,
    });
    const works = z.object({ results: z.array(workSchema), meta: z.object({ count: z.number() }).optional() }).parse(raw);
    const pool = new Map<string, Candidate>();
    for (const work of works.results) {
      for (const item of work.authorships.slice(0, 200)) {
        if (!item.author.id || !item.author.display_name) continue;
        const entry = pool.get(item.author.id) ?? {
          id: item.author.id, name: item.author.display_name, institutions: [], citations: null, h_index: null,
          topics: [], matching_papers: [], matched_paper_count: 0, topic_score: 0, latest_matching_year: 0,
        };
        if (!entry.matching_papers.some(p => p.id === work.id)) {
          entry.matching_papers.push(paper(work));
          entry.matched_paper_count++;
          entry.topic_score = Math.max(entry.topic_score, titleOverlap(topic, work.display_name ?? ""));
          entry.latest_matching_year = Math.max(entry.latest_matching_year, work.publication_year ?? 0);
        }
        pool.set(entry.id, entry);
      }
    }
    const candidates = rankCandidates([...pool.values()]).slice(0, 40);
    if (candidates.length) {
      const rawAuthors = await this.request("authors", {
        filter: `openalex_id:${candidates.map(c => authorId(c.id)).join("|")}`,
        per_page: "40", select: authorFields,
      });
      const authors = z.object({ results: z.array(authorSchema) }).parse(rawAuthors).results;
      for (const author of authors) {
        const candidate = pool.get(author.id);
        if (!candidate) continue;
        candidate.name = author.display_name;
        candidate.citations = author.cited_by_count ?? null;
        candidate.h_index = author.summary_stats?.h_index ?? null;
        candidate.institutions = (author.last_known_institutions ?? []).map(institution);
        candidate.topics = author.topics?.slice(0, 5).map(t => t.display_name) ?? [];
      }
    }
    let filtered = candidates.filter(c => !countries.length || c.institutions.some(i => i.country && countries.includes(i.country)));
    if (sort === "citations") filtered = [...filtered].sort((a, b) => (b.citations ?? -1) - (a.citations ?? -1));
    return {
      topic, provider: "OpenAlex", retrieved_at: new Date().toISOString(), since_year: since,
      papers_available: works.meta?.count ?? null, papers_examined: works.results.length,
      candidates_examined: pool.size, candidates_enriched: candidates.length,
      candidates: filtered.slice(0, limit).map(c => ({
        ...c, matching_papers: c.matching_papers.slice(0, 3), faculty_status: "unverified",
        citation_attribution: "unverified_until_identity_checked",
        identity_review: c.institutions.length > 3 ? "Multiple institutions appear in this record; check for name conflation before attributing citations." : "Match identity against official faculty pages and paper titles.",
      })),
      limitations: [
        "Discovery examines up to 50 relevant papers and enriches up to 40 author candidates; this is not an exhaustive faculty search.",
        "All author positions are eligible; authorship does not establish faculty status or supervision eligibility.",
        "Country filters use publication-derived affiliations and need university-page verification.",
        "Citation sorting applies only to this discovery pool. Research fit is a title-overlap heuristic, not an admissions score.",
        "Expand into related topic phrases and university faculty searches to improve coverage, particularly for new faculty.",
      ],
    };
  }
}
