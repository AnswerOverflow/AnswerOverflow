import { httpRouter } from "convex/server";
import type { Id } from "./_generated/dataModel";
import { httpAction } from "./_generated/server";
import { authComponent, createAuth } from "./betterAuth";

const http = httpRouter();

/**
 * HTTP endpoint to serve attachments from Convex storage
 * Usage: GET /getAttachment?storageId=<storage_id>
 */
http.route({
	path: "/getAttachment",
	method: "GET",
	handler: httpAction(async (ctx, req) => {
		const url = new URL(req.url);
		const storageId = url.searchParams.get("storageId");

		if (!storageId) {
			return new Response("Missing storageId parameter", {
				status: 400,
			});
		}

		try {
			// Get the file URL from storage
			const fileUrl = await ctx.storage.getUrl(storageId as Id<"_storage">);

			if (!fileUrl) {
				return new Response("File not found", {
					status: 404,
				});
			}

			// Redirect to the file URL
			return new Response(null, {
				status: 302,
				headers: {
					Location: fileUrl,
					"Cache-Control": "public, max-age=31536000, immutable",
				},
			});
		} catch (error) {
			console.error("Error serving attachment:", error);
			return new Response("Error serving attachment", {
				status: 500,
			});
		}
	}),
});

authComponent.registerRoutes(http, createAuth);

export default http;
