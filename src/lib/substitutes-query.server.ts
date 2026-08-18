import { createClient } from "@supabase/supabase-js";

import type { Database } from "@/integrations/supabase/types";
import {
  AUM_FLOOR,
  ELIGIBILITY_CHECKS_SKIPPED,
  MANUAL_UNIVERSE,
  SCORE_COMPLETENESS_PCT,
  detectCountry,
  detectSector,
  scoreCandidates,
  type EtfRow,
  type FindSubstitutesResult,
} from "./substitutes.server";

function client() {
  return createClient<Database>(
    process.env["SUPABASE_URL"]!,
    process.env["SUPABASE_PUBLISHABLE_KEY"]!,
    { auth: { storage: undefined, persistSession: false, autoRefreshToken: false } },
  );
}

const ilikeOr = (column: string, keywords: string[]) =>
  keywords.map((k) => `${column}.ilike.%${k}%`).join(",");

export async function runFindSubstitutes(rawIsin: string): Promise<FindSubstitutesResult> {
  const supabase = client();
  const isin = rawIsin.trim().toUpperCase();

  const { data: sourceRows, error: sourceError } = await supabase
    .from("etf_master")
    .select("*")
    .eq("isin", isin)
    .limit(1);

  if (sourceError) throw new Error(`Failed to load source ETF: ${sourceError.message}`);
  const source = sourceRows?.[0] as EtfRow | undefined;
  if (!source) return { type: "source_not_found", isin };

  const notes: string[] = [];
  let eligible: EtfRow[] = [];
  let basis = "";

  // Step 1 — sector match (across all asset classes).
  const sector = detectSector(source.fund_name);
  if (sector) {
    const { data, error } = await supabase
      .from("etf_master")
      .select("*")
      .eq("is_ishares", true)
      .gte("aum", AUM_FLOOR)
      .or(ilikeOr("fund_name", sector[1]));
    if (error) throw new Error(`Sector search failed: ${error.message}`);
    if (data && data.length > 0) {
      eligible = data as EtfRow[];
      basis = `sector_match (${sector[0]})`;
    } else {
      notes.push("no direct sector product found");
    }
  }

  // Step 2 — single-country match (no AUM floor, manual rows allowed here only).
  if (eligible.length === 0) {
    const country = detectCountry(source.fund_name);
    if (country) {
      const { data, error } = await supabase
        .from("etf_master")
        .select("*")
        .eq("is_ishares", true)
        .eq("asset_class", source.asset_class ?? "")
        .or([ilikeOr("fund_name", country[1]), ilikeOr("geographic_exposure", country[1])].join(","));
      if (error) throw new Error(`Country search failed: ${error.message}`);
      if (data && data.length > 0) {
        eligible = data as EtfRow[];
        basis = `country_match (${country[0]})`;
      } else {
        notes.push("no direct country-specific product found");
      }
    }
  }

  // Step 3 — broad category fallback (manual additions excluded — load-bearing).
  if (eligible.length === 0) {
    const { data, error } = await supabase
      .from("etf_master")
      .select("*")
      .eq("is_ishares", true)
      .eq("asset_class", source.asset_class ?? "")
      .gte("aum", AUM_FLOOR)
      .neq("source_universe", MANUAL_UNIVERSE);
    if (error) throw new Error(`Broad category search failed: ${error.message}`);
    if (data && data.length > 0) {
      eligible = data as EtfRow[];
      basis = `broad_category_match (${source.asset_class ?? "unknown asset class"})`;
    }
  }

  if (eligible.length === 0) {
    return {
      type: "no_eligible_candidates",
      notes,
      score_completeness_pct: SCORE_COMPLETENESS_PCT,
      eligibility_checks_skipped: [...ELIGIBILITY_CHECKS_SKIPPED],
    };
  }

  return {
    type: "ok",
    source: {
      ticker: source.ticker,
      fund_name: source.fund_name,
      isin: source.isin,
      asset_class: source.asset_class,
      domicile: source.domicile,
    },
    eligibility_basis: basis,
    notes,
    score_completeness_pct: SCORE_COMPLETENESS_PCT,
    eligibility_checks_skipped: [...ELIGIBILITY_CHECKS_SKIPPED],
    candidates: scoreCandidates(source, eligible),
  };
}
