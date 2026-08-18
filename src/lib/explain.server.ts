// "explain-recommendation" — TWO parts with DIFFERENT trust tiers.
//
// PART 1 (grounded): the LLM sees ONLY the structured payload produced by
// find-substitutes. No web access, no outside facts, no invented numbers.
//
// PART 2 (LIVE RESEARCH — deliberately NOT grounded-only): the LLM is given
// live web-search results (Firecrawl) for current holdings data, because
// holdings do not exist in etf_master and won't for a while. This is a
// documented exception to the "approved structured data only" rule and MUST
// be surfaced to the user as a lower trust tier than Part 1 and than the
// deterministic score.
import type { EtfRow, FindSubstitutesSuccess, SubstituteCandidate } from "./substitutes.server";

const AI_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";
const MODEL = "google/gemini-2.5-flash";
const FIRECRAWL_SEARCH = "https://connector-gateway.lovable.dev/firecrawl/v2/search";
export const PROMPT_VERSION = "explain-recommendation-v1";

export interface LiveSource {
  url: string;
  title: string | null;
}

export interface ExplainResult {
  source_isin: string;
  candidate_isin: string | null;
  created_at: string;
  rationale: string | null;
  rationale_error: string | null;
  live_holdings: string | null;
  live_error: string | null;
  live_sources: LiveSource[];
  score_completeness_pct: number;
}

type ChatMessage = { role: "system" | "user"; content: string };

async function chat(messages: ChatMessage[]): Promise<string> {
  const apiKey = process.env["LOVABLE_API_KEY"];
  if (!apiKey) throw new Error("LOVABLE_API_KEY is not configured");

  const res = await fetch(AI_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ model: MODEL, messages }),
  });

  if (!res.ok) {
    const body = await res.text();
    if (res.status === 429) throw new Error("Rate limited by the AI gateway — try again shortly.");
    if (res.status === 402) throw new Error("AI credits exhausted for this workspace.");
    throw new Error(`AI request failed [${res.status}]: ${body}`);
  }

  const json = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  return json.choices?.[0]?.message?.content?.trim() ?? "";
}

// ---------------------------------------------------------------- Part 1 ---

function candidateSummary(c: SubstituteCandidate, rank: number) {
  return {
    rank,
    ticker: c.ticker,
    isin: c.isin,
    fund_name: c.fund_name,
    issuer: c.issuer,
    domicile: c.domicile,
    legal_wrapper: c.legal_wrapper,
    asset_class: c.asset_class,
    trading_currency: c.trading_currency,
    aum: c.aum,
    aum_currency: c.aum_currency,
    aum_as_of_date: c.aum_as_of_date,
    management_fee_bps: c.management_fee_bps,
    exposure_score: c.exposure_score,
    methodology_score: c.methodology_score,
    methodology_basis: c.methodology_basis,
    wrapper_score: c.wrapper_score,
    implementation_score: c.implementation_score,
    holdings_score: c.holdings_score,
    match_score: c.match_score,
  };
}

export function buildGroundedPayload(source: EtfRow, result: FindSubstitutesSuccess) {
  return {
    source_etf: {
      ticker: source.ticker,
      isin: source.isin,
      fund_name: source.fund_name,
      issuer: source.issuer,
      domicile: source.domicile,
      legal_wrapper: source.legal_wrapper,
      asset_class: source.asset_class,
      trading_currency: source.trading_currency,
      aum: source.aum,
      aum_currency: source.aum_currency,
      aum_as_of_date: source.aum_as_of_date,
      management_fee_bps: source.management_fee_bps,
    },
    eligibility_basis: result.eligibility_basis,
    notes: result.notes,
    score_completeness_pct: result.score_completeness_pct,
    eligibility_checks_skipped: result.eligibility_checks_skipped,
    candidates: result.candidates.slice(0, 2).map((c, i) => candidateSummary(c, i + 1)),
    placeholder_score_components: ["holdings_score (null — no holdings data in the database)"],
  };
}

export async function runPart1(payload: ReturnType<typeof buildGroundedPayload>) {
  const system = [
    "You explain a deterministic ETF substitution recommendation for an internal sales-support tool.",
    "GROUNDING RULE: use ONLY the JSON payload provided. Never introduce facts, holdings, index details,",
    "performance data or numbers that are not present in the payload. No web knowledge. If something is",
    "unknown, say it is not available in the database.",
    "The deterministic score is authoritative; your text is a secondary explanation of it.",
    "Write compact markdown with these sections: **Headline**, **Why it's the best structural match**,",
    "**Key differences and trade-offs**, **Why the runner-up ranked lower** (omit only if no second candidate),",
    "**Data-freshness caveats**. The caveats section MUST state the score_completeness_pct figure from the",
    "payload explicitly, note that holdings_score is a placeholder (null), and list the eligibility checks",
    "that were not enforced. Keep it under 350 words.",
  ].join(" ");

  return chat([
    { role: "system", content: system },
    { role: "user", content: JSON.stringify(payload) },
  ]);
}

// ---------------------------------------------------------------- Part 2 ---
// LIVE RESEARCH TIER. Everything below leaves the approved-data boundary.

async function firecrawlSearch(query: string) {
  const lovableKey = process.env["LOVABLE_API_KEY"];
  const connectionKey = process.env["FIRECRAWL_API_KEY"];
  if (!lovableKey || !connectionKey) throw new Error("Firecrawl connector is not configured");

  const res = await fetch(FIRECRAWL_SEARCH, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${lovableKey}`,
      "X-Connection-Api-Key": connectionKey,
    },
    body: JSON.stringify({
      query,
      limit: 3,
      scrapeOptions: { formats: ["markdown"] },
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Firecrawl search failed [${res.status}]: ${body}`);
  }

  type Hit = { url?: string; title?: string; description?: string; markdown?: string };
  const json = (await res.json()) as { data?: Hit[] | { web?: Hit[] } };
  // Firecrawl v2 returns either data[] or data.web[] depending on search mode.
  const rows: Hit[] = Array.isArray(json.data) ? json.data : (json.data?.web ?? []);
  return rows
    .filter((r) => r.url)
    .map((r) => ({
      url: r.url!,
      title: r.title ?? null,
      excerpt: (r.markdown ?? r.description ?? "").slice(0, 6000),
    }));
}

export async function runPart2(
  source: { ticker: string; isin: string; fund_name: string | null },
  candidate: { ticker: string; isin: string; fund_name: string | null },
): Promise<{ text: string | null; error: string | null; sources: LiveSource[] }> {
  let findings: Array<{ url: string; title: string | null; excerpt: string }> = [];
  try {
    const queries = [
      `${source.ticker} ${source.fund_name ?? ""} ETF top holdings sector breakdown factsheet`,
      `${candidate.ticker} ${candidate.fund_name ?? ""} iShares ETF top holdings sector country breakdown factsheet`,
    ];
    const batches = await Promise.all(queries.map((q) => firecrawlSearch(q)));
    findings = batches.flat();
  } catch (e) {
    return { text: null, error: (e as Error).message, sources: [] };
  }

  const usable = findings.filter((f) => f.excerpt.trim().length > 200);
  if (usable.length === 0) {
    return {
      text: null,
      error: "The live lookup returned no usable holdings data. No holdings comparison is available.",
      sources: findings.map(({ url, title }) => ({ url, title })),
    };
  }

  const system = [
    "You are doing a LIVE web research summary (NOT from the approved internal database).",
    "Use only the supplied search results. Do not invent holdings, weights or breakdowns.",
    "If the results do not actually contain holdings or breakdown data for a fund, say so explicitly",
    "for that fund instead of guessing.",
    "Output compact markdown with: **Holdings overlap**, **Notable exposure differences**,",
    "**Sales talking points** (2-3 bullets, each grounded in what the results actually show).",
    "Cite the source URL inline after any specific figure. Keep it under 300 words.",
  ].join(" ");

  const user = JSON.stringify({
    source_etf: source,
    ishares_candidate: candidate,
    live_search_results: usable,
  });

  try {
    const text = await chat([
      { role: "system", content: system },
      { role: "user", content: user },
    ]);
    return {
      text: text || null,
      error: text ? null : "The live lookup produced no summary.",
      sources: usable.map(({ url, title }) => ({ url, title })),
    };
  } catch (e) {
    return {
      text: null,
      error: (e as Error).message,
      sources: usable.map(({ url, title }) => ({ url, title })),
    };
  }
}
