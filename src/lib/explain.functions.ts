import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import type { ExplainResult } from "./explain.server";

export type { ExplainResult, LiveSource } from "./explain.server";

export const explainRecommendation = createServerFn({ method: "POST" })
  .validator((data) => z.object({ isin: z.string() }).parse(data))
  .handler(async ({ data }): Promise<ExplainResult> => {
    const { runExplainRecommendation } = await import("./explain-query.server");
    return runExplainRecommendation(data.isin);
  });
