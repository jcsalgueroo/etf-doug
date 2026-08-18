import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { Database } from "@/integrations/supabase/types";

type EtfSearchRow = Pick<
  Database["public"]["Tables"]["etf_master"]["Row"],
  | "id"
  | "isin"
  | "ticker"
  | "fund_name"
  | "issuer"
  | "domicile"
  | "legal_wrapper"
  | "trading_currency"
  | "asset_class"
  | "management_fee_bps"
  | "aum"
  | "aum_currency"
  | "aum_as_of_date"
  | "is_ishares"
>;

export type CompetitorEtf = Omit<EtfSearchRow, "is_ishares">;

export type SearchEtfResult =
  | { type: "not_found"; ticker: string }
  | { type: "ishares"; ticker: string }
  | { type: "competitor"; etf: CompetitorEtf };

export const searchEtf = createServerFn({ method: "GET" })
  .validator((data) => z.object({ ticker: z.string() }).parse(data))
  .handler(async ({ data }): Promise<SearchEtfResult> => {
    const normalizedTicker = data.ticker.trim().toUpperCase();
    if (!normalizedTicker) {
      return { type: "not_found", ticker: data.ticker };
    }

    const supabase = createClient<Database>(
      process.env["SUPABASE_URL"]!,
      process.env["SUPABASE_PUBLISHABLE_KEY"]!,
      {
        auth: {
          storage: undefined,
          persistSession: false,
          autoRefreshToken: false,
        },
      },
    );

    const { data: rows, error } = await supabase
      .from("etf_master")
      .select(
        "id, isin, ticker, fund_name, issuer, domicile, legal_wrapper, trading_currency, asset_class, management_fee_bps, aum, aum_currency, aum_as_of_date, is_ishares",
      )
      .ilike("ticker", normalizedTicker)
      .returns<EtfSearchRow[]>();

    if (error) {
      throw new Error(`Failed to search ETF: ${error.message}`);
    }

    if (!rows || rows.length === 0) {
      return { type: "not_found", ticker: normalizedTicker };
    }

    // iShares tickers are candidates, not valid search inputs.
    if (rows.some((row) => row.is_ishares)) {
      return { type: "ishares", ticker: normalizedTicker };
    }

    const competitor = rows.find((row) => !row.is_ishares) ?? rows[0]!;
    const { is_ishares: _, ...etf } = competitor;
    return { type: "competitor", etf };
  });

export type TickerSuggestion = {
  ticker: string;
  fund_name: string | null;
  issuer: string | null;
};

export const suggestTickers = createServerFn({ method: "GET" })
  .validator((data) => z.object({ query: z.string() }).parse(data))
  .handler(async ({ data }): Promise<TickerSuggestion[]> => {
    const q = data.query.trim().toUpperCase();
    if (q.length < 1) return [];

    const supabase = createClient<Database>(
      process.env["SUPABASE_URL"]!,
      process.env["SUPABASE_PUBLISHABLE_KEY"]!,
      {
        auth: {
          storage: undefined,
          persistSession: false,
          autoRefreshToken: false,
        },
      },
    );

    const { data: rows, error } = await supabase
      .from("etf_master")
      .select("ticker, fund_name, issuer")
      .eq("is_ishares", false)
      .ilike("ticker", `${q}%`)
      .order("ticker")
      .limit(8)
      .returns<TickerSuggestion[]>();

    if (error) throw new Error(`Failed to load ticker suggestions: ${error.message}`);
    return rows ?? [];
  });
