export type Institution = { id: string; name: string; country: string | null };
export type Paper = {
  id: string;
  title: string;
  year: number | null;
  url: string;
  citations: number | null;
};
export type Candidate = {
  id: string;
  name: string;
  institutions: Institution[];
  citations: number | null;
  h_index: number | null;
  topics: string[];
  matching_papers: Paper[];
  matched_paper_count: number;
  topic_score: number;
  latest_matching_year: number;
};
export type PageEvidence = {
  source_url: string;
  retrieved_at: string;
  title: string;
  text: string;
  truncated: boolean;
  links: { label: string; url: string }[];
  emails: string[];
  content_kind: "untrusted_public_webpage";
};
