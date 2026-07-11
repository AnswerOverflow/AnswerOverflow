import { createMcpHandler } from "mcp-handler";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { registerInternalDebugTools } from "@/lib/mcp/internal-debug-tools";

const handler = createMcpHandler(
	(server) => {
		registerInternalDebugTools(server);
	},
	{
		instructions:
			"Answer Overflow internal debugging tools. Start with live Convex function metadata and the issue-specific inspectors, correlate results with Discord reports, request IDs, deployment telemetry, and source code, and use mutating Convex operations only when the debugging workflow requires them.",
	},
	{
		basePath: "/internal",
		maxDuration: 60,
	},
);

function constantTimeEqual(left: string, right: string): boolean {
	if (left.length !== right.length) return false;

	let mismatch = 0;
	for (let index = 0; index < left.length; index += 1) {
		mismatch |= left.charCodeAt(index) ^ right.charCodeAt(index);
	}
	return mismatch === 0;
}

function isAuthorized(request: NextRequest): boolean {
	const expectedToken = process.env.BACKEND_ACCESS_TOKEN;
	if (!expectedToken) return false;

	const authorization = request.headers.get("authorization");
	if (!authorization?.startsWith("Bearer ")) return false;

	return constantTimeEqual(
		authorization.slice("Bearer ".length),
		expectedToken,
	);
}

/** Handles the authenticated internal debugging MCP endpoint. */
export async function POST(request: NextRequest) {
	if (!process.env.BACKEND_ACCESS_TOKEN) {
		return NextResponse.json(
			{ error: "Internal debugging is not configured" },
			{ status: 503 },
		);
	}

	if (!isAuthorized(request)) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}

	return handler(request);
}
