import { describe, expect, it, vi } from "vitest";
import { buildRoutingResult } from "./request-routing";

// isOnMainSite resolves the main hostname from NEXT_PUBLIC_BASE_URL, which is
// unset under vitest and would fall back to localhost.
vi.stubEnv("NEXT_PUBLIC_BASE_URL", "https://www.answeroverflow.com");

function makeInput(overrides: {
	method?: string;
	acceptHeader?: string;
	pathname?: string;
	host?: string;
}) {
	const host = overrides.host ?? "www.answeroverflow.com";
	const pathname = overrides.pathname ?? "/mcp";
	return {
		method: overrides.method ?? "GET",
		host,
		pathname,
		search: "",
		acceptHeader: overrides.acceptHeader ?? "",
		url: `https://${host}${pathname}`,
		bypassSubpathRedirect: false,
	};
}

const browserAccept =
	"text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8";

describe("buildRoutingResult GET /mcp", () => {
	it("rewrites browser requests to /mcp/setup", () => {
		const result = buildRoutingResult(
			makeInput({ acceptHeader: browserAccept }),
		);
		expect(result).toEqual({ type: "rewrite", pathname: "/mcp/setup" });
	});

	it("does not rewrite when Accept includes text/event-stream", () => {
		const result = buildRoutingResult(
			makeInput({ acceptHeader: "application/json, text/event-stream" }),
		);
		expect(result).toEqual({ type: "next" });
	});

	it("does not rewrite when Accept includes application/json", () => {
		const result = buildRoutingResult(
			makeInput({ acceptHeader: "application/json" }),
		);
		expect(result).toEqual({ type: "next" });
	});

	it("does not rewrite when Accept includes application/mcp", () => {
		const result = buildRoutingResult(
			makeInput({ acceptHeader: "application/mcp+json" }),
		);
		expect(result).toEqual({ type: "next" });
	});

	it("does not rewrite an SSE request that also lists text/html", () => {
		const result = buildRoutingResult(
			makeInput({ acceptHeader: "text/event-stream, text/html" }),
		);
		expect(result).toEqual({ type: "next" });
	});

	it("does not rewrite when Accept is empty", () => {
		const result = buildRoutingResult(makeInput({ acceptHeader: "" }));
		expect(result).toEqual({ type: "next" });
	});

	it("does not rewrite when Accept is */*", () => {
		const result = buildRoutingResult(makeInput({ acceptHeader: "*/*" }));
		expect(result).toEqual({ type: "next" });
	});

	it("matches Accept case-insensitively", () => {
		const result = buildRoutingResult(
			makeInput({ acceptHeader: "TEXT/HTML,application/xhtml+xml" }),
		);
		expect(result).toEqual({ type: "rewrite", pathname: "/mcp/setup" });
	});

	it("does not rewrite POST /mcp", () => {
		const result = buildRoutingResult(
			makeInput({ method: "POST", acceptHeader: "application/json" }),
		);
		expect(result).toEqual({ type: "next" });
	});

	it("does not rewrite browser POST /mcp", () => {
		const result = buildRoutingResult(
			makeInput({ method: "POST", acceptHeader: browserAccept }),
		);
		expect(result).toEqual({ type: "next" });
	});

	it("rewrites tenant protocol GET /mcp to the tenant route, not setup", () => {
		const result = buildRoutingResult(
			makeInput({
				host: "questions.answeroverflow.com",
				acceptHeader: "application/json, text/event-stream",
			}),
		);
		expect(result).toEqual({
			type: "rewrite",
			pathname: "/questions.answeroverflow.com/mcp",
		});
	});
});
