import { normalizeText } from "./pages.js";
import type { PageEvidence } from "./types.js";

/** Confirm an excerpt exists while leaving semantic interpretation visibly separate. */
export function checkQuote(page: PageEvidence, quote: string) {
  const found = normalizeText(page.text).includes(normalizeText(quote));
  return {
    quote_found: found, source_url: page.source_url, retrieved_at: page.retrieved_at,
    excerpt: quote, source_truncated: page.truncated,
    interpretation_note: "This verifies the excerpt's presence only. Check identity, context, dates, and contradictions before using it as evidence.",
  };
}

export type RecruitmentClaim = {
  status: "recruiting" | "not_recruiting" | "general_invitation" | "unknown" | "conflicting";
  evidence_found: boolean;
  target_intake: string;
  stated_intake: string | null;
  scope: "specific_intake" | "undated" | "general";
};

/** Prevent missing evidence or mismatched intake from becoming a current recruiting claim. */
export function qualifyRecruitment(claim: RecruitmentClaim) {
  if (claim.status === "unknown" || !claim.evidence_found) return { status: "unknown", reason: "No verified statement supports a recruiting conclusion." };
  if (claim.status === "conflicting") return { status: "conflicting", reason: "Sources disagree; display the dated statements and ask the applicant to verify." };
  if (claim.status === "general_invitation") return { status: "general_invitation", reason: "An invitation to contact is not a confirmed PhD opening." };
  if (claim.scope !== "specific_intake" || !claim.stated_intake) {
    return { status: "undated_statement", reported_status: claim.status, reason: "The statement is not tied to the applicant's intended intake." };
  }
  if (normalizeText(claim.stated_intake).toLowerCase() !== normalizeText(claim.target_intake).toLowerCase()) {
    return { status: "different_intake", reported_status: claim.status, reason: `The statement concerns ${claim.stated_intake}; the applicant targets ${claim.target_intake}.` };
  }
  return { status: claim.status, reason: "A verified excerpt was classified as referring explicitly to the requested intake; inspect its context." };
}
