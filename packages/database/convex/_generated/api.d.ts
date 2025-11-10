/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as attachments from "../attachments.js";
import type * as auth from "../auth.js";
import type * as channels from "../channels.js";
import type * as dashboard from "../dashboard.js";
import type * as dashboard_mutations from "../dashboard_mutations.js";
import type * as dashboard_queries from "../dashboard_queries.js";
import type * as discord_accounts from "../discord_accounts.js";
import type * as http from "../http.js";
import type * as ignored_discord_accounts from "../ignored_discord_accounts.js";
import type * as messages from "../messages.js";
import type * as server_preferences from "../server_preferences.js";
import type * as servers from "../servers.js";
import type * as user_server_settings from "../user_server_settings.js";

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
  attachments: typeof attachments;
  auth: typeof auth;
  channels: typeof channels;
  dashboard: typeof dashboard;
  dashboard_mutations: typeof dashboard_mutations;
  dashboard_queries: typeof dashboard_queries;
  discord_accounts: typeof discord_accounts;
  http: typeof http;
  ignored_discord_accounts: typeof ignored_discord_accounts;
  messages: typeof messages;
  server_preferences: typeof server_preferences;
  servers: typeof servers;
  user_server_settings: typeof user_server_settings;
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

export declare const components: {};
