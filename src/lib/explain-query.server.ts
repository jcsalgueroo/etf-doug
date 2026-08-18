import { createClient } from "@supabase/supabase-js";

import type { Database } from "@/integrations/supabase/types";
import type { EtfRow, FindSubstitutesSuccess } from "./substitutes.server";
import { runFindSubstitutes } from "./substitutes-query.server";
import {
  PROMPT_VERSION,
  buildGroundedPayload,
  runPart1,
  runPart2,
  type ExplainResult,
} from "./explain.server";

function client() {
  return createClient<Database>(
    process.env["SUPABASE_URL"]!,
    process.env["SUPABASE_PUBLISHABLE_KEY"]!,
    { auth: { storage: undefined, persistSession: false, autoRefreshToken: false } },
  );
}

export async function runExplainRecommendation(rawIsin: string): Promise<ExplainResult> {
  const isin = rawIsin.trim().toUpperCase();
  const supabase = client();

  const { data: rows, error } = await supabase
    .from("etf_master")
    .select("*")
    .eq("isin", isin)
    .limit(1);
  if (error) throw new Error(`Failed to load source ETF: ${error.message}`);
  const source = rows?.[0] as EtfRow | undefined;
  if (!source) throw new Error(`No ETF found for ISIN ${isin}`);

  const substitutes = await runFindSubstitutes(isin);
  if (substitutes.type !== "ok" || substitutes.candidates.length === 0) {
    throw new Error("No recommendation is available to explain for this ETF.");
  }
  const result = substitutes as FindSubstitutesSuccess;
  const top = result.candidates[0]!;

  const payload = buildGroundedPayload(source, result);

  // Part 1 (grounded) and Part 2 (live research) run independently so a live
  // lookup failure never takes down the grounded rationale.
  const [part1, part2] = await Promise.all([
    runPart1(payload).then(
      (text) => ({ text, error: null as string | null }),
      (e: Error) => ({ text: null as string | null, error: e.message }),
    ),
    runPart2(
      { ticker: source.ticker, isin: source.isin, fund_name: source.fund_name },
      { ticker: top.ticker, isin: top.isin, fund_name: top.fund_name },
    ),
  ]);

  const explain: ExplainResult = {
    source_isin: source.isin,
    candidate_isin: top.isin,
    created_at: new Date().toISOString(),
    rationale: part1.text,
    rationale_error: part1.error,
    live_holdings: part2.text,
    live_error: part2.error,
    live_sources: part2.sources,
    score_completeness_pct: result.score_completeness_pct,
  };

  // Audit log — includes which URLs the non-approved live lookup actually used.
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { error: logError } = await supabaseAdmin.from("explanation_requests").insert({
    model: "google/gemini-2.5-flash",
    prompt_version: PROMPT_VERSION,
    response: {
      source_isin: explain.source_isin,
      candidate_isin: explain.candidate_isin,
      requested_at: explain.created_at,
      grounded_payload: payload,
      part1_grounded_rationale: explain.rationale,
      part1_error: explain.rationale_error,
      part2_live_holdings: explain.live_holdings,
      part2_error: explain.live_error,
      part2_sources: explain.live_sources,
      part2_trust_tier: "live_web_research_not_approved_data",
    } as unknown as NonNullable<
      Database["public"]["Tables"]["explanation_requests"]["Insert"]["response"]
    >,
  });
  if (logError) console.error(`[explain] audit log insert failed: ${logError.message}`);

  return explain;
}
