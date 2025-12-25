import { api } from "@packages/database/convex/_generated/api";
import { ConvexHttpClient } from "convex/browser";

function getConvexClient() {
	return new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);
}

type MarkSolutionResult =
	| { success: true }
	| { success: false; status: 400 | 401 | 403 | 404 | 500; error: string };

export async function handleMarkSolution(args: {
	messageId: string;
	solutionId: string;
	apiKey: string;
}): Promise<MarkSolutionResult> {
	const client = getConvexClient();

	try {
		await client.mutation(api.api.messages.markSolution, {
			messageId: BigInt(args.messageId),
			solutionId: BigInt(args.solutionId),
			apiKey: args.apiKey,
		});

		return { success: true };
	} catch (error) {
		console.error("Error marking solution:", error);

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
