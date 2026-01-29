import { MINUTE, RateLimiter } from "@convex-dev/rate-limiter";
import { components } from "../_generated/api";

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
});

export { MINUTE } from "@convex-dev/rate-limiter";
