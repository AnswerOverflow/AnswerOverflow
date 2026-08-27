import { beforeEach, describe, expect, it, vi } from "vitest";

const handlerGET = vi.fn();
const handlerPOST = vi.fn();

vi.mock("@convex-dev/better-auth/nextjs", () => ({
	convexBetterAuthNextJs: () => ({
		handler: {
			GET: handlerGET,
			POST: handlerPOST,
		},
	}),
}));

vi.mock("botid/server", () => ({
	checkBotId: vi.fn(async () => ({ isBot: false })),
}));

const { handleAuth, stripNextInternalParams } = await import("./auth");

function makeContext(request: Request) {
	return { request } as never;
}

describe("stripNextInternalParams", () => {
	it("removes nxtP* and nxtI* query keys and keeps others", () => {
		const url = new URL(
			"https://www.answeroverflow.com/api/auth/sign-in/social?provider=discord&nxtPslugs=auth&nxtIfoo=1&redirect=/dashboard",
		);
		const cleaned = stripNextInternalParams(url);
		expect(cleaned.searchParams.has("nxtPslugs")).toBe(false);
		expect(cleaned.searchParams.has("nxtIfoo")).toBe(false);
		expect(cleaned.searchParams.get("provider")).toBe("discord");
		expect(cleaned.searchParams.get("redirect")).toBe("/dashboard");
	});
});

describe("handleAuth proxyToConvex", () => {
	beforeEach(() => {
		handlerGET.mockReset();
		handlerPOST.mockReset();
	});

	it("strips nxtPslugs before forwarding and preserves body/headers", async () => {
		handlerPOST.mockImplementation(async (req: Request) => {
			const forwardedUrl = new URL(req.url);
			expect(forwardedUrl.searchParams.has("nxtPslugs")).toBe(false);
			expect(forwardedUrl.searchParams.get("provider")).toBe("discord");
			expect(req.headers.get("content-type")).toBe("application/json");
			expect(await req.text()).toBe('{"provider":"discord"}');
			return new Response(JSON.stringify({ ok: true }), { status: 200 });
		});

		const request = new Request(
			"https://www.answeroverflow.com/api/auth/sign-in/social?provider=discord&nxtPslugs=auth%2Fsign-in%2Fsocial",
			{
				method: "POST",
				headers: { "content-type": "application/json" },
				body: '{"provider":"discord"}',
			},
		);

		const response = await handleAuth(makeContext(request));
		expect(response.status).toBe(200);
		expect(handlerPOST).toHaveBeenCalledTimes(1);
	});

	it("retries once after TypeError fetch failed and succeeds with replayable body", async () => {
		const fetchFailed = new TypeError("fetch failed");
		(fetchFailed as Error & { cause?: unknown }).cause = {
			code: "ECONNRESET",
		};

		handlerPOST
			.mockImplementationOnce(async (req: Request) => {
				// Consume the body the way a failed upstream attempt would.
				await req.arrayBuffer();
				throw fetchFailed;
			})
			.mockImplementationOnce(async (req: Request) => {
				expect(await req.text()).toBe('{"provider":"discord"}');
				return new Response(JSON.stringify({ url: "https://discord.com" }), {
					status: 200,
				});
			});

		const request = new Request(
			"https://www.answeroverflow.com/api/auth/sign-in/social",
			{
				method: "POST",
				headers: { "content-type": "application/json" },
				body: '{"provider":"discord"}',
			},
		);

		const response = await handleAuth(makeContext(request));
		expect(response.status).toBe(200);
		expect(await response.json()).toEqual({ url: "https://discord.com" });
		expect(handlerPOST).toHaveBeenCalledTimes(2);
	});

	it("propagates non-network errors without retrying", async () => {
		handlerPOST.mockRejectedValueOnce(new Error("invalid provider"));

		const request = new Request(
			"https://www.answeroverflow.com/api/auth/sign-in/social",
			{
				method: "POST",
				headers: { "content-type": "application/json" },
				body: "{}",
			},
		);

		await expect(handleAuth(makeContext(request))).rejects.toThrow(
			"invalid provider",
		);
		expect(handlerPOST).toHaveBeenCalledTimes(1);
	});

	it("returns JSON 502 when retry also fails with fetch failed", async () => {
		const fetchFailed = new TypeError("fetch failed");
		handlerPOST.mockRejectedValue(fetchFailed);

		const request = new Request(
			"https://www.answeroverflow.com/api/auth/sign-in/social",
			{
				method: "POST",
				headers: { "content-type": "application/json" },
				body: "{}",
			},
		);

		const response = await handleAuth(makeContext(request));
		expect(response.status).toBe(502);
		expect(response.headers.get("content-type")).toBe("application/json");
		expect(await response.json()).toEqual({
			message: "Unable to reach auth service",
		});
		expect(handlerPOST).toHaveBeenCalledTimes(2);
	});
});
