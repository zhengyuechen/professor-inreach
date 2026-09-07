import type { Candidate } from "./types.js";

/** Order discovery candidates by topic overlap, supporting papers, then recency. */
export function rankCandidates(candidates: Candidate[]): Candidate[] {
  // PRODUCT CHOICE: Replace this comparison to change default discovery priorities.
  // Citations are displayed separately; this order is not an admissions probability.
  return [...candidates].sort((a, b) =>
    b.topic_score - a.topic_score ||
    b.matched_paper_count - a.matched_paper_count ||
    b.latest_matching_year - a.latest_matching_year ||
    a.name.localeCompare(b.name)
  );
}
