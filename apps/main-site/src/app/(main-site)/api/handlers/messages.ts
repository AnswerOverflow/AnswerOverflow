import { PostHogCaptureClientLayer } from "@packages/database/analytics/server/capture-client";
import { track } from "@packages/database/analytics/server/tracking";
import { api } from "@packages/database/convex/_generated/api";
import type { SolvedQuestionTrackingPayload } from "@packages/database/convex/api/messages";
import { ConvexHttpClient } from "convex/browser";
import { Effect } from "effect";

function getConvexClient() {
	return new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);
}

type MarkSolutionResult =
	| { success: true }
	| { success: false; status: 400 | 401 | 403 | 404 | 500; error: string };

async function trackSolvedQuestionFromApi(
	payload: SolvedQuestionTrackingPayload,
) {
	const { timeToSolveInMs, ...props } = payload;

	await Effect.runPromise(
		track("Solved Question", {
			...props,
			"Time To Solve In Ms": timeToSolveInMs,
		}).pipe(Effect.provide(PostHogCaptureClientLayer)),
	);
}

export async function handleMarkSolution(args: {
	messageId: string;
	solutionId: string | null;
	apiKey: string;
}): Promise<MarkSolutionResult> {
	const client = getConvexClient();

	try {
		const trackingPayload = await client.mutation(
			api.api.messages.updateSolution,
			{
				messageId: BigInt(args.messageId),
				solutionId: args.solutionId ? BigInt(args.solutionId) : null,
				apiKey: args.apiKey,
			},
		);

		if (trackingPayload) {
			try {
				await trackSolvedQuestionFromApi(trackingPayload);
			} catch (trackingError) {
				console.error(
					"Error tracking solved question analytics:",
					trackingError,
				);
			}
		}

		return { success: true };
	} catch (error) {
		console.error("Error updating solution:", error);

		if (error instanceof Error) {
			if (
				error.message.includes("Invalid API key") ||
				error.message.includes("not linked")
			) {
				return { success: false, status: 401, error: "Unauthorized" };
			}
			if (error.message.includes("Insufficient permissions")) {
				return { success: false, status: 403, error: "Forbidden" };
			}
			if (error.message.includes("not found")) {
				return { success: false, status: 404, error: error.message };
			}
		}

		return {
			success: false,
			status: 500,
			error: error instanceof Error ? error.message : "Internal server error",
		};
	}
}
