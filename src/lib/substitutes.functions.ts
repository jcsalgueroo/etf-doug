import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import type { FindSubstitutesResult } from "./substitutes.server";

export type {
  FindSubstitutesResult,
  FindSubstitutesSuccess,
  SubstituteCandidate,
} from "./substitutes.server";

export const findSubstitutes = createServerFn({ method: "GET" })
  .validator((data) => z.object({ isin: z.string() }).parse(data))
  .handler(async ({ data }): Promise<FindSubstitutesResult> => {
    const { runFindSubstitutes } = await import("./substitutes-query.server");
    return runFindSubstitutes(data.isin);
  });
