/* prettier-ignore-start */

/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as actions from "../actions.js";
import type * as argumentsValidation from "../argumentsValidation.js";
import type * as authentication from "../authentication.js";
import type * as component from "../component.js";
import type * as http from "../http.js";
import type * as messages from "../messages.js";
import type * as mutations from "../mutations.js";
import type * as pagination from "../pagination.js";
import type * as queries from "../queries.js";
import type * as scheduler from "../scheduler.js";
import type * as storage from "../storage.js";
import type * as textSearch from "../textSearch.js";
import type * as vectorSearch from "../vectorSearch.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";
/**
 * A utility for referencing Convex functions in your app's API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
declare const fullApi: ApiFromModules<{
  actions: typeof actions;
  argumentsValidation: typeof argumentsValidation;
  authentication: typeof authentication;
  component: typeof component;
  http: typeof http;
  messages: typeof messages;
  mutations: typeof mutations;
  pagination: typeof pagination;
  queries: typeof queries;
  scheduler: typeof scheduler;
  storage: typeof storage;
  textSearch: typeof textSearch;
  vectorSearch: typeof vectorSearch;
}>;
declare const fullApiWithMounts: typeof fullApi;

export declare const api: FilterApi<
  typeof fullApiWithMounts,
  FunctionReference<any, "public">
>;
export declare const internal: FilterApi<
  typeof fullApiWithMounts,
  FunctionReference<any, "internal">
>;

export declare const components: {
  counter: {
    public: {
      add: FunctionReference<
        "mutation",
        "internal",
        { count: number; name: string; shards?: number },
        null
      >;
      count: FunctionReference<"query", "internal", { name: string }, number>;
      mutationWithNestedQuery: FunctionReference<
        "mutation",
        "internal",
        {},
        any
      >;
      mutationWithNumberArg: FunctionReference<
        "mutation",
        "internal",
        { a: number },
        any
      >;
      schedule: FunctionReference<
        "mutation",
        "internal",
        { name: string },
        any
      >;
    };
  };
};

/* prettier-ignore-end */
