import { HOUR, MINUTE, RateLimiter } from "@convex-dev/rate-limiter";
import { components } from "../_generated/api";

export const rateLimiter = new RateLimiter(components.rateLimiter, {
	githubCreateIssue: {
		kind: "token bucket",
		rate: 10,
		period: MINUTE,
		capacity: 5,
	},
	githubFetchRepos: {
		kind: "token bucket",
		rate: 30,
		period: MINUTE,
		capacity: 10,
	},
	githubApiPerUser: {
		kind: "token bucket",
		rate: 60,
		period: HOUR,
		capacity: 20,
	},
});

export { HOUR, MINUTE } from "@convex-dev/rate-limiter";
