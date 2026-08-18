// Substitution scoring algorithm ("find-substitutes").
// Implemented exactly as validated — do not redesign.
import type { Database } from "@/integrations/supabase/types";

export type EtfRow = Database["public"]["Tables"]["etf_master"]["Row"];

export const ELIGIBILITY_CHECKS_SKIPPED = [
  "currency_hedge_match",
  "distribution_policy_match",
  "active_passive_match",
  "esg_thematic_mandate_match",
  "fixed_income_duration_credit_compatibility",
] as const;

export const SCORE_COMPLETENESS_PCT = 80.0;
export const AUM_FLOOR = 50_000_000;
export const MANUAL_UNIVERSE = "ishares_candidate_manual_addition";

// --- Sector keyword cascade (most specific first, plain substring matches) ---
export const SECTOR_KEYWORDS: Array<[sector: string, keywords: string[]]> = [
  ["Regional banking", ["regional bank"]],
  // Checked BEFORE Technology: AIQ/BAI abbreviate to "Tech" and never contain "technology".
  [
    "Artificial Intelligence / Robotics",
    ["artificial intelligence", "artifical intelligence", "a.i.", "robotics", "automation & robotics"],
  ],
  // " tech" (leading space, plain substring) avoids Biotech/FinTech without regex.
  ["Technology", ["technology", " tech"]],
  ["Industrial", ["industrial"]],
  ["Health Care", ["healthcare", "health care"]],
  ["Communication Services", ["telecommunications", "communication"]],
  ["Consumer Discretionary", ["consumer discretionary"]],
  ["Materials", ["materials"]],
  ["Utilities", ["utilities"]],
  ["Consumer Staples", ["consumer staples"]],
  ["Financial", ["financial", "bank"]],
  ["Real Estate", ["real estate", "reit"]],
  ["Energy", ["energy"]],
];

// Step-2 single-country keywords (eligibility).
export const COUNTRY_KEYWORDS: Array<[country: string, keywords: string[]]> = [
  ["Colombia", ["colombia", "colcap"]],
  ["Brazil", ["brazil", "brasil"]],
  ["Mexico", ["mexico"]],
  ["Chile", ["chile"]],
  ["Peru", ["peru"]],
  ["Argentina", ["argentina"]],
];

// Wider single-country/theme keyword list used only by the Exposure keyword term.
export const COUNTRY_THEME_KEYWORDS: Array<[name: string, keywords: string[]]> = [
  ...COUNTRY_KEYWORDS,
  ["China", ["china", "csi 300"]],
  ["Japan", ["japan"]],
  ["Korea", ["korea"]],
  ["Taiwan", ["taiwan"]],
  ["India", ["india"]],
  ["Germany", ["germany"]],
  ["France", ["france"]],
  ["Switzerland", ["switzerland", "swiss"]],
  ["United Kingdom", ["united kingdom", "ftse 100"]],
  ["Canada", ["canada"]],
  ["Australia", ["australia"]],
];

const lc = (v: string | null | undefined) => (v ?? "").toLowerCase();
const has = (haystack: string, needles: string[]) =>
  needles.some((n) => haystack.includes(n));

export function detectSector(fundName: string | null): [string, string[]] | null {
  const name = lc(fundName);
  for (const [sector, keywords] of SECTOR_KEYWORDS) {
    if (has(name, keywords)) return [sector, keywords];
  }
  return null;
}

export function detectCountry(text: string | null): [string, string[]] | null {
  const name = lc(text);
  for (const [country, keywords] of COUNTRY_KEYWORDS) {
    if (has(name, keywords)) return [country, keywords];
  }
  return null;
}

export function detectCountryTheme(text: string | null): [string, string[]] | null {
  const name = lc(text);
  for (const [country, keywords] of COUNTRY_THEME_KEYWORDS) {
    if (has(name, keywords)) return [country, keywords];
  }
  return null;
}


// --- Methodology: base index family detection (most specific first) ---
const FAMILY_PATTERNS: Array<[family: string, test: (n: string) => boolean]> = [
  ["MSCI ACWI ex US", (n) => n.includes("msci") && n.includes("acwi") && (n.includes("ex us") || n.includes("ex u.s."))],
  ["MSCI ACWI", (n) => n.includes("msci") && (n.includes("acwi") || n.includes("all country world"))],
  ["MSCI World ex-USA", (n) => n.includes("msci") && n.includes("world") && (n.includes("ex usa") || n.includes("ex-usa"))],
  ["MSCI World", (n) => n.includes("msci") && n.includes("world")],
  ["MSCI Emerging Markets ex China", (n) => n.includes("msci") && n.includes("emerging markets") && n.includes("ex china")],
  ["MSCI Emerging Markets", (n) => n.includes("msci") && n.includes("emerging markets")],
  ["MSCI Japan", (n) => n.includes("msci") && n.includes("japan")],
  ["MSCI China", (n) => n.includes("msci") && n.includes("china")],
  ["MSCI COLCAP", (n) => n.includes("colcap")],
  ["MSCI USA", (n) => n.includes("msci") && n.includes("usa")],
  ["MSCI EMU", (n) => n.includes("msci") && n.includes("emu")],
  ["MSCI Europe", (n) => n.includes("msci") && n.includes("europe")],
  ["S&P 500", (n) => n.includes("s&p 500")],
  ["S&P MidCap 400", (n) => n.includes("s&p 400") || n.includes("s&p mid cap 400") || n.includes("s&p midcap 400")],
  ["Nasdaq 100", (n) => /nasdaq.{0,3}100/.test(n)],
  ["Russell 1000", (n) => n.includes("russell 1000")],
  ["Russell 2000", (n) => n.includes("russell 2000")],
  ["EURO STOXX 50", (n) => n.includes("euro stoxx 50")],
  ["EURO STOXX Banks", (n) => n.includes("euro stoxx") && n.includes("bank")],
  ["STOXX Europe 600", (n) => n.includes("stoxx europe 600")],
  ["CSI 300 / China A-Shares", (n) => n.includes("csi 300") || n.includes("china a-shares")],
  ["GBI-EM (JPM EM Local Currency Bond)", (n) => n.includes("gbi-em")],
  ["FTSE 100", (n) => n.includes("ftse 100")],
  ["FTSE Emerging Markets", (n) => n.includes("ftse") && n.includes("emerging markets")],
  ["FTSE Japan", (n) => n.includes("ftse") && n.includes("japan")],
  ["FTSE Europe", (n) => n.includes("ftse") && n.includes("europe")],
  ["FTSE Developed", (n) => n.includes("ftse") && n.includes("develop")],
];

export function detectFamily(fundName: string | null): string | null {
  const n = lc(fundName);
  for (const [family, test] of FAMILY_PATTERNS) {
    if (test(n)) return family;
  }
  return null;
}

export function detectOverlays(row: Pick<EtfRow, "fund_name" | "currency_hedged">): Set<string> {
  const n = lc(row.fund_name);
  const out = new Set<string>();
  if (n.includes("minimum volatility") || n.includes("min vol")) out.add("Minimum Volatility");
  if (n.includes("momentum")) out.add("Momentum");
  if (n.includes("quality")) out.add("Quality");
  if (n.includes("value factor") || /\bvalue\b/.test(n)) out.add("Value");
  if (n.includes("growth")) out.add("Growth");
  if (n.includes("garp")) out.add("GARP");
  if (n.includes("equal weight")) out.add("Equal Weight");
  if (n.includes("small cap") || n.includes("small-cap") || n.includes("smid cap")) out.add("Small Cap");
  if (n.includes("mid cap") || n.includes("mid-cap") || n.includes("midcap")) out.add("Mid Cap");
  if (["esg", "sri", "screened", "climate", "paris-aligned", "ctb", "low carbon", "sustainable"].some((k) => n.includes(k)))
    out.add("ESG / Sustainability");
  if (n.includes("islamic") || n.includes("shariah")) out.add("Islamic / Shariah");
  if (n.includes("dividend")) out.add("Dividend");
  if (row.currency_hedged === true || n.includes("hedged")) out.add("Currency-Hedged");
  const sector = detectSector(row.fund_name);
  if (sector) out.add(`Sector: ${sector[0]}`);
  return out;
}

export function resolveProvider(row: Pick<EtfRow, "fund_name" | "index_provider">): string | null {
  const n = lc(row.fund_name);
  if (n.includes("russell")) return "Russell";
  if (n.includes("ftse")) return "FTSE";
  return row.index_provider ?? null;
}

function symmetricDiffSize(a: Set<string>, b: Set<string>): number {
  let count = 0;
  for (const v of a) if (!b.has(v)) count++;
  for (const v of b) if (!a.has(v)) count++;
  return count;
}

export function methodologyScore(
  source: EtfRow,
  candidate: EtfRow,
): { score: number; basis: string } {
  const srcFamily = detectFamily(source.fund_name);
  const candFamily = detectFamily(candidate.fund_name);

  if (srcFamily && candFamily && srcFamily === candFamily) {
    const a = detectOverlays(source);
    const b = detectOverlays(candidate);
    const diff = symmetricDiffSize(a, b);
    if (diff === 0) {
      return { score: 1.0, basis: `family_match ("${srcFamily}"), overlays also match` };
    }
    const score = Math.max(0.5, 1.0 - 0.15 * diff);
    return {
      score,
      basis: `family_match ("${srcFamily}"), ${diff} overlay difference${diff === 1 ? "" : "s"}`,
    };
  }

  if (srcFamily && candFamily) {
    return { score: 0.3, basis: `family_mismatch ("${srcFamily}" vs "${candFamily}")` };
  }

  const srcProvider = resolveProvider(source);
  const candProvider = resolveProvider(candidate);
  if (srcProvider && candProvider) {
    if (srcProvider === candProvider) {
      return { score: 0.55, basis: `provider_match_only ("${srcProvider}")` };
    }
    return {
      score: 0.2,
      basis: `provider_mismatch_only ("${srcProvider}" vs "${candProvider}")`,
    };
  }

  return { score: 0.15, basis: "undetermined_penalty (no index family or provider resolvable)" };
}

// --- Wrapper score ---
const DOMICILE_COMPAT: Record<string, Record<string, number>> = {
  US: { IE: 0.5, DE: 0.5 },
  IE: { DE: 0.9, US: 0.3 },
  LU: { IE: 0.9, DE: 0.9, US: 0.3 },
  FR: { IE: 0.8, DE: 0.8, US: 0.2 },
};

export function wrapperScore(source: EtfRow, candidate: EtfRow): number {
  const src = (source.domicile ?? "").toUpperCase();
  const cand = (candidate.domicile ?? "").toUpperCase();
  // Same domicile always scores 1.0 — code-level rule, never a table lookup.
  const domicileScore = src && cand && src === cand ? 1.0 : (DOMICILE_COMPAT[src]?.[cand] ?? 0.3);
  const currencyScore =
    source.trading_currency && candidate.trading_currency &&
    source.trading_currency.toUpperCase() === candidate.trading_currency.toUpperCase()
      ? 1.0
      : 0.5;
  return 0.7 * domicileScore + 0.3 * currencyScore;
}

// --- Exposure score ---
const REGION_AGNOSTIC = ["global", "world", "emerging markets", "developed markets", "acwi", "international"];

// Implied market_exposure for a source category, when its own field is empty.
const EMERGING_HINTS = [
  "emerging", " em ", "frontier", "china", "india", "brazil", "brasil", "mexico",
  "colombia", "colcap", "chile", "peru", "argentina", "latin america", "korea",
  "taiwan", "south africa", "turkey", "indonesia", "thailand", "malaysia", "vietnam",
];
const DEVELOPED_HINTS = [
  "developed", "s&p 500", "russell", "nasdaq", "u.s.", "us ", "usa", "japan",
  "europe", "euro stoxx", "ftse 100", "germany", "france", "switzerland", "canada",
  "australia", "united kingdom",
];

export function impliedMarket(row: EtfRow): string | null {
  const explicit = lc(row.market_exposure).trim();
  if (explicit) return explicit;
  const n = ` ${lc(row.fund_name)} `;
  if (has(n, EMERGING_HINTS)) return "emerging";
  if (has(n, DEVELOPED_HINTS)) return "developed";
  return null;
}

export function exposureScore(source: EtfRow, candidate: EtfRow): number {
  let score = 0.4;

  const srcGeo = lc(source.geographic_exposure).trim();
  const candGeo = lc(candidate.geographic_exposure).trim();
  const regionAgnostic = !srcGeo || REGION_AGNOSTIC.some((r) => srcGeo === r || srcGeo.includes(r));

  if (regionAgnostic) {
    // Region-agnostic credit only applies when the category has no implied market
    // (e.g. "Global Equities"), or when the candidate is in that same market.
    const srcMarket = impliedMarket(source);
    const candMarket = impliedMarket(candidate);
    if (!srcMarket || srcMarket === candMarket) {
      score += 0.2;
    }
  } else if (srcGeo && candGeo && srcGeo === candGeo) {
    score += 0.35;
  } else if (srcGeo.includes("latin america") && detectCountry(candidate.fund_name)) {
    // A single-country LatAm fund is at least as regionally precise as the broad bucket.
    score += 0.35;
  }

  if (
    source.market_exposure &&
    candidate.market_exposure &&
    lc(source.market_exposure) === lc(candidate.market_exposure)
  ) {
    score += 0.15;
  }

  const implied = detectCountry(source.fund_name) ?? detectSector(source.fund_name);
  if (implied) {
    if (has(lc(candidate.fund_name), implied[1])) score += 0.1;
  } else {
    score += 0.1;
  }

  return Math.min(1, score);
}

// --- Result types ---
export interface SubstituteCandidate {
  ticker: string;
  fund_name: string;
  isin: string;
  issuer: string | null;
  domicile: string | null;
  legal_wrapper: string | null;
  asset_class: string | null;
  trading_currency: string | null;
  aum_currency: string | null;
  aum_as_of_date: string | null;
  aum: number | null;
  management_fee_bps: number | null;
  exposure_score: number;
  methodology_score: number;
  methodology_basis: string;
  wrapper_score: number;
  implementation_score: number;
  holdings_score: null;
  match_score: number;
  score_completeness_pct: number;
  eligibility_checks_skipped: string[];
}

export interface FindSubstitutesSuccess {
  type: "ok";
  source: Pick<EtfRow, "ticker" | "fund_name" | "isin" | "asset_class" | "domicile">;
  eligibility_basis: string;
  notes: string[];
  score_completeness_pct: number;
  eligibility_checks_skipped: string[];
  candidates: SubstituteCandidate[];
}

export type FindSubstitutesResult =
  | FindSubstitutesSuccess
  | { type: "source_not_found"; isin: string }
  | {
      type: "no_eligible_candidates";
      notes: string[];
      score_completeness_pct: number;
      eligibility_checks_skipped: string[];
    };

const round1 = (n: number) => Math.round(n * 10) / 10;

export function scoreCandidates(
  source: EtfRow,
  eligible: EtfRow[],
): SubstituteCandidate[] {
  const fees = eligible.map((c) => c.management_fee_bps).filter((v): v is number => v != null);
  const aums = eligible.map((c) => c.aum).filter((v): v is number => v != null);
  const feeMin = fees.length ? Math.min(...fees) : null;
  const feeMax = fees.length ? Math.max(...fees) : null;
  const aumMin = aums.length ? Math.min(...aums) : null;
  const aumMax = aums.length ? Math.max(...aums) : null;

  const scored = eligible.map((candidate) => {
    const exposure = exposureScore(source, candidate);
    const { score: methodology, basis } = methodologyScore(source, candidate);
    const wrapper = wrapperScore(source, candidate);

    let feeScore = 0.5;
    if (
      candidate.management_fee_bps != null &&
      feeMin != null &&
      feeMax != null &&
      feeMax !== feeMin
    ) {
      feeScore = 1 - (candidate.management_fee_bps - feeMin) / (feeMax - feeMin);
    }
    let aumScore = 0.5;
    if (candidate.aum != null && aumMin != null && aumMax != null && aumMax !== aumMin) {
      aumScore = (candidate.aum - aumMin) / (aumMax - aumMin);
    }
    const implementation = 0.6 * feeScore + 0.4 * aumScore;

    const match =
      ((0.3 * exposure + 0.25 * methodology + 0.15 * wrapper + 0.1 * implementation) / 0.8) * 100;

    return {
      ticker: candidate.ticker,
      fund_name: candidate.fund_name,
      isin: candidate.isin,
      issuer: candidate.issuer,
      domicile: candidate.domicile,
      legal_wrapper: candidate.legal_wrapper,
      asset_class: candidate.asset_class,
      trading_currency: candidate.trading_currency,
      aum_currency: candidate.aum_currency,
      aum_as_of_date: candidate.aum_as_of_date,
      aum: candidate.aum,
      management_fee_bps: candidate.management_fee_bps,
      exposure_score: exposure,
      methodology_score: methodology,
      methodology_basis: basis,
      wrapper_score: wrapper,
      implementation_score: implementation,
      holdings_score: null,
      match_score: round1(match),
      score_completeness_pct: SCORE_COMPLETENESS_PCT,
      eligibility_checks_skipped: [...ELIGIBILITY_CHECKS_SKIPPED],
    } satisfies SubstituteCandidate;
  });

  return scored.sort((a, b) => b.match_score - a.match_score).slice(0, 3);
}
