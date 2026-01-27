import { MINUTE, RateLimiter } from "@convex-dev/rate-limiter";
import { components } from "../_generated/api";

export const CHAT_MESSAGE_CONFIG = {
	kind: "token bucket" as const,
	rate: 20,
	period: MINUTE * 60,
	capacity: 20,
};

export const CHAT_MESSAGE_ANON_CONFIG = {
	kind: "token bucket" as const,
	rate: 10,
	period: MINUTE * 60,
	capacity: 10,
};

export const rateLimiter = new RateLimiter(components.rateLimiter, {
	githubCreateIssue: {
		kind: "token bucket",
		rate: 100,
		period: MINUTE * 10,
		capacity: 100,
	},
	githubFetchRepos: {
		kind: "token bucket",
		rate: 30,
		period: MINUTE,
		capacity: 10,
	},
	aiIssueExtraction: {
		kind: "token bucket",
		rate: 100,
		period: MINUTE * 10,
		capacity: 100,
	},
	chatMessage: CHAT_MESSAGE_CONFIG,
	chatMessageAnon: CHAT_MESSAGE_ANON_CONFIG,
});

export { MINUTE } from "@convex-dev/rate-limiter";
