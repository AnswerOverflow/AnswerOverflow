import { useQueries } from "convex/react";
import { makeUseQueryWithStatus } from "convex-helpers/react";
// Do this once somewhere, name it whatever you want.
export const useQueryWithStatus = makeUseQueryWithStatus(useQueries);
