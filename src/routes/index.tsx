import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { searchEtf, type SearchEtfResult, type CompetitorEtf } from "@/lib/etf.functions";

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
      <RecommendedSubstitute />
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

function RecommendedSubstitute() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Recommended substitute</CardTitle>
        <CardDescription>Scoring the best iShares alternative</CardDescription>
      </CardHeader>
      <CardContent>
        {/*
          TODO: Prompt 2 — wire the scoring server function here and replace
          the skeleton below with the actual recommended substitute result.
        */}
        <div className="space-y-3">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-4 w-2/3" />
        </div>
      </CardContent>
    </Card>
  );
}
