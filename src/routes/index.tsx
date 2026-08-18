import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { searchEtf, type SearchEtfResult, type CompetitorEtf } from "@/lib/etf.functions";
import {
  findSubstitutes,
  type SubstituteCandidate,
} from "@/lib/substitutes.functions";
import { explainRecommendation } from "@/lib/explain.functions";


interface SearchParams {
  ticker?: string;
}

export const Route = createFileRoute("/")({
  validateSearch: (search: Record<string, unknown>): SearchParams => {
    const ticker = typeof search["ticker"] === "string" ? search["ticker"] : undefined;
    return ticker ? { ticker } : {};
  },
  head: () => ({
    meta: [
      { title: "Doug — ETF Ticker Search" },
      {
        name: "description",
        content: "Search competitor ETF tickers and find iShares substitutes.",
      },
      {
        property: "og:title",
        content: "Doug — ETF Ticker Search",
      },
      {
        property: "og:description",
        content: "Search competitor ETF tickers and find iShares substitutes.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  loaderDeps: ({ search: { ticker } }) => ({ ticker: ticker?.trim() }),
  loader: async ({ deps: { ticker } }) => {
    if (!ticker) return null;
    return searchEtf({ data: { ticker } });
  },
  component: Index,
});

function Index() {
  const search = Route.useSearch();
  const navigate = useNavigate({ from: "/" });
  const initialResult = Route.useLoaderData();
  const [inputValue, setInputValue] = useState(search.ticker ?? "");

  useEffect(() => {
    setInputValue(search.ticker ?? "");
  }, [search.ticker]);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const ticker = (formData.get("ticker") as string | null)?.trim() ?? "";
    navigate({
      to: "/",
      search: (prev) => (ticker ? { ...prev, ticker } : { ...prev }),
    });
  };

  return (
    <div className="min-h-screen bg-background px-4 py-12">
      <div className="mx-auto max-w-3xl">
        <header className="mb-8">
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">
            Doug
          </h1>
          <p className="text-muted-foreground">Internal ETF substitution tool</p>
        </header>

        <form onSubmit={handleSubmit} className="flex gap-2">
          <Input
            type="text"
            name="ticker"
            placeholder="Enter competitor ticker (e.g. VTI)"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            className="flex-1"
            aria-label="Ticker"
          />
          <Button type="submit">Search</Button>
        </form>

        <div className="mt-8">
          {initialResult && <SearchResult result={initialResult} />}
        </div>
      </div>
    </div>
  );
}

function SearchResult({ result }: { result: SearchEtfResult }) {
  if (result.type === "not_found") {
    return (
      <Alert>
        <AlertTitle>Ticker not found</AlertTitle>
        <AlertDescription>
          Ticker not found in the competitor universe.
        </AlertDescription>
      </Alert>
    );
  }

  if (result.type === "ishares") {
    return (
      <Alert>
        <AlertTitle>iShares fund</AlertTitle>
        <AlertDescription>This is already an iShares fund.</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      <ProfileCard etf={result.etf} />
      <RecommendedSubstitute source={result.etf} />
    </div>
  );
}


function ProfileCard({ etf }: { etf: CompetitorEtf }) {
  const formattedAum =
    etf.aum != null
      ? new Intl.NumberFormat("en-US", {
          style: "currency",
          currency: etf.aum_currency || "USD",
          maximumFractionDigits: 0,
        }).format(etf.aum)
      : "N/A";

  return (
    <Card>
      <CardHeader>
        <CardTitle>{etf.fund_name || etf.ticker}</CardTitle>
        <CardDescription>
          {etf.ticker} · {etf.asset_class || "Unknown asset class"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <dl className="grid grid-cols-2 gap-x-6 gap-y-5 sm:grid-cols-3">
          <div>
            <dt className="text-sm font-medium text-muted-foreground">Issuer</dt>
            <dd className="mt-1 text-sm text-foreground">{etf.issuer || "—"}</dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-muted-foreground">Domicile</dt>
            <dd className="mt-1 text-sm text-foreground">{etf.domicile || "—"}</dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-muted-foreground">
              Trading currency
            </dt>
            <dd className="mt-1 text-sm text-foreground">
              {etf.trading_currency || "—"}
            </dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-muted-foreground">AUM</dt>
            <dd className="mt-1 text-sm text-foreground">{formattedAum}</dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-muted-foreground">AUM as of</dt>
            <dd className="mt-1 text-sm text-foreground">
              {etf.aum_as_of_date || "—"}
            </dd>
          </div>
        </dl>
      </CardContent>
    </Card>
  );
}

function pct(value: number) {
  return value.toFixed(2);
}

const SKIPPED_CHECK_LABELS: Record<string, string> = {
  currency_hedge_match: "Currency-hedge status was not compared",
  distribution_policy_match:
    "Distribution policy (accumulating vs. distributing) was not compared",
  active_passive_match: "Active vs. passive management style was not compared",
  esg_thematic_mandate_match: "ESG / thematic mandate was not compared",
  fixed_income_duration_credit_compatibility:
    "Fixed-income duration and credit compatibility were not compared",
};

function NotAvailable() {
  return <span className="text-muted-foreground italic">Not available</span>;
}

function abbreviateUsd(value: number) {
  const abs = Math.abs(value);
  const units: Array<[number, string]> = [
    [1e12, "T"],
    [1e9, "B"],
    [1e6, "M"],
    [1e3, "K"],
  ];
  for (const [size, suffix] of units) {
    if (abs >= size) {
      return `$${(value / size).toFixed(2).replace(/\.?0+$/, "")}${suffix}`;
    }
  }
  return `$${value.toFixed(0)}`;
}

function abbreviateRaw(value: number) {
  const abs = Math.abs(value);
  const units: Array<[number, string]> = [
    [1e12, "T"],
    [1e9, "B"],
    [1e6, "M"],
    [1e3, "K"],
  ];
  for (const [size, suffix] of units) {
    if (abs >= size) {
      return `${(value / size).toFixed(2).replace(/\.?0+$/, "")}${suffix}`;
    }
  }
  return value.toFixed(0);
}

// No FX conversion exists, so non-USD AUM keeps its own currency code.
function formatAum(aum: number | null, currency: string | null) {
  if (aum == null) return null;
  const code = (currency || "USD").toUpperCase();
  if (code === "USD") return abbreviateUsd(aum);
  return `${code} ${abbreviateRaw(aum)}`;
}

function cell(value: string | number | null | undefined) {
  if (value == null || value === "") return <NotAvailable />;
  return <>{value}</>;
}

function ComparisonTable({
  source,
  candidate,
}: {
  source: CompetitorEtf;
  candidate: SubstituteCandidate;
}) {
  const rows: Array<[string, React.ReactNode, React.ReactNode]> = [
    ["Fund name", cell(source.fund_name), cell(candidate.fund_name)],
    ["Issuer", cell(source.issuer), cell(candidate.issuer)],
    ["Domicile", cell(source.domicile), cell(candidate.domicile)],
    ["Legal wrapper", cell(source.legal_wrapper), cell(candidate.legal_wrapper)],
    [
      "Trading currency",
      cell(source.trading_currency),
      cell(candidate.trading_currency),
    ],
    ["Asset class", cell(source.asset_class), cell(candidate.asset_class)],
    [
      "Management fee",
      cell(source.management_fee_bps != null ? `${source.management_fee_bps} bps` : null),
      cell(
        candidate.management_fee_bps != null
          ? `${candidate.management_fee_bps} bps`
          : null,
      ),
    ],
    [
      "AUM",
      cell(formatAum(source.aum, source.aum_currency)),
      cell(formatAum(candidate.aum, candidate.aum_currency)),
    ],
    ["AUM as of", cell(source.aum_as_of_date), cell(candidate.aum_as_of_date)],
  ];

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <caption className="sr-only">
          Field-by-field comparison of the source ETF and the recommended iShares
          substitute
        </caption>
        <thead>
          <tr className="border-b border-border text-left">
            <th scope="col" className="py-2 pr-4 font-medium text-muted-foreground">
              Field
            </th>
            <th scope="col" className="py-2 pr-4 font-medium text-foreground">
              {source.ticker} (source)
            </th>
            <th scope="col" className="py-2 font-medium text-foreground">
              {candidate.ticker} (recommended)
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map(([label, left, right]) => (
            <tr key={label} className="border-b border-border/60 last:border-0">
              <th
                scope="row"
                className="py-2 pr-4 text-left align-top font-medium text-muted-foreground"
              >
                {label}
              </th>
              <td className="py-2 pr-4 align-top text-foreground">{left}</td>
              <td className="py-2 align-top text-foreground">{right}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function CandidateCard({
  candidate,
  rank,
}: {
  candidate: SubstituteCandidate;
  rank: number;
}) {
  return (
    <div className="rounded-md border border-border p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-foreground">
            #{rank} · {candidate.ticker} — {candidate.fund_name}
          </p>
          <p className="text-xs text-muted-foreground">
            {candidate.isin} · {candidate.domicile || "—"} ·{" "}
            {candidate.trading_currency || "—"}
          </p>
        </div>
        <div className="text-right">
          <p className="text-lg font-semibold tabular-nums text-foreground">
            {candidate.match_score.toFixed(1)}
          </p>
          <p className="text-xs text-muted-foreground">match score</p>
        </div>
      </div>

      <p className="mt-2 text-xs text-foreground">
        <span className="font-medium text-muted-foreground">
          Methodology basis:
        </span>{" "}
        {candidate.methodology_basis}
      </p>

      <table className="mt-4 w-full text-sm">
        <tbody className="[&_td]:py-1 [&_th]:py-1 [&_th]:text-left [&_th]:font-medium [&_th]:text-muted-foreground">
          <tr>
            <th scope="row">Exposure</th>
            <td className="tabular-nums">{pct(candidate.exposure_score)}</td>
            <th scope="row">Wrapper</th>
            <td className="tabular-nums">{pct(candidate.wrapper_score)}</td>
          </tr>
          <tr>
            <th scope="row">Methodology</th>
            <td className="tabular-nums">{pct(candidate.methodology_score)}</td>
            <th scope="row">Implementation</th>
            <td className="tabular-nums">{pct(candidate.implementation_score)}</td>
          </tr>
          <tr>
            <th scope="row">AUM</th>
            <td className="tabular-nums">
              {formatAum(candidate.aum, candidate.aum_currency) ?? "—"}
            </td>
            <th scope="row">Fee (bps)</th>
            <td className="tabular-nums">{candidate.management_fee_bps ?? "—"}</td>
          </tr>
        </tbody>
      </table>

      <p className="mt-3 text-xs text-muted-foreground">
        Score completeness: {candidate.score_completeness_pct.toFixed(1)}%
      </p>
    </div>
  );
}

function RecommendedSubstitute({ source }: { source: CompetitorEtf }) {
  const call = useServerFn(findSubstitutes);
  const { data, isPending, error } = useQuery({
    queryKey: ["find-substitutes", source.isin],
    queryFn: () => call({ data: { isin: source.isin } }),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recommended substitute</CardTitle>
        <CardDescription>Best iShares alternative by match score</CardDescription>
      </CardHeader>
      <CardContent>
        {isPending && (
          <div className="space-y-3">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-4 w-2/3" />
          </div>
        )}

        {error && (
          <Alert>
            <AlertTitle>Scoring failed</AlertTitle>
            <AlertDescription>{(error as Error).message}</AlertDescription>
          </Alert>
        )}

        {data?.type === "source_not_found" && (
          <Alert>
            <AlertTitle>Source ETF not found</AlertTitle>
            <AlertDescription>No record for ISIN {data.isin}.</AlertDescription>
          </Alert>
        )}

        {data?.type === "no_eligible_candidates" && (
          <Alert>
            <AlertTitle>No eligible candidates</AlertTitle>
            <AlertDescription>
              {data.notes.length ? data.notes.join("; ") : "No iShares candidate passed eligibility."}
            </AlertDescription>
          </Alert>
        )}

        {data?.type === "ok" && (
          <div className="space-y-6">
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <span className="rounded border border-border px-2 py-1">
                Score completeness: {data.score_completeness_pct.toFixed(1)}%
              </span>
              <span className="rounded border border-border px-2 py-1">
                Eligibility: {data.eligibility_basis}
              </span>
              {data.notes.map((note) => (
                <span key={note} className="rounded border border-border px-2 py-1">
                  {note}
                </span>
              ))}
            </div>

            {data.candidates[0] && (
              <CandidateCard candidate={data.candidates[0]} rank={1} />
            )}

            {data.candidates[0] && (
              <section className="space-y-3">
                <h2 className="text-sm font-semibold text-foreground">
                  Side-by-side comparison
                </h2>
                <ComparisonTable source={source} candidate={data.candidates[0]} />
                <div
                  role="note"
                  className="rounded-md border border-border bg-muted/50 px-3 py-2 text-xs text-muted-foreground"
                >
                  This ranking uses {data.score_completeness_pct.toFixed(0)}% of the
                  intended matching model — index-holdings comparison requires data
                  not yet available in this database.
                </div>
                <ExplainPanel isin={source.isin} />
              </section>
            )}

            {data.candidates.length > 1 && (
              <Collapsible>
                <CollapsibleTrigger asChild>
                  <Button variant="outline" size="sm">
                    Other options ({data.candidates.length - 1})
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-4 space-y-4">
                  {data.candidates.slice(1).map((candidate, i) => (
                    <CandidateCard
                      key={candidate.isin}
                      candidate={candidate}
                      rank={i + 2}
                    />
                  ))}
                </CollapsibleContent>
              </Collapsible>
            )}

            {data.eligibility_checks_skipped.length > 0 && (
              <Collapsible>
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" size="sm" className="text-xs">
                    What wasn&apos;t checked (
                    {data.eligibility_checks_skipped.length})
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <ul className="mt-2 list-inside list-disc text-xs text-muted-foreground">
                    {data.eligibility_checks_skipped.map((check) => (
                      <li key={check}>{SKIPPED_CHECK_LABELS[check] ?? check}</li>
                    ))}
                  </ul>
                </CollapsibleContent>
              </Collapsible>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}


