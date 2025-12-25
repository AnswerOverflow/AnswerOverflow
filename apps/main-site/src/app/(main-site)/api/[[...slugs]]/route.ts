import { openapi } from "@elysiajs/openapi";
import { Elysia, t } from "elysia";
import { handleAuth } from "../handlers/auth";
import { handleConvexWebhook } from "../handlers/convex-webhooks";
import { handleMarkSolution } from "../handlers/messages";

const app = new Elysia({ prefix: "/api" })
	.use(
		openapi({
			exclude: {
				paths: ["/api/openapi"],
			},
			documentation: {
				info: {
					title: "AnswerOverflow API",
					version: "1.0.0",
					description:
						"API for interacting with AnswerOverflow programmatically.",
				},
				servers: [
					{
						url: "https://www.answeroverflow.com/",
						description: "Production",
					},
				],
				components: {
					securitySchemes: {
						apiKey: {
							type: "apiKey",
							in: "header",
							name: "x-api-key",
							description:
								"Your API key. Generate one from your dashboard settings.",
						},
					},
				},
			},
		}),
	)
	.post("/v1/webhooks/convex", handleConvexWebhook, {
		detail: { hide: true },
	})
	.all("/auth/*", handleAuth, {
		detail: { hide: true },
	})
	.post(
		"/v1/messages/:id",
		async ({ params, body, headers, set }) => {
			const apiKey = headers["x-api-key"];
			if (!apiKey) {
				set.status = 401;
				return { error: "Unauthorized - x-api-key header required" };
			}

			const result = await handleMarkSolution({
				messageId: params.id,
				solutionId: body.solutionId,
				apiKey,
			});

			if (!result.success) {
				set.status = result.status;
				return { error: result.error };
			}

			return { success: true as const };
		},
		{
			body: t.Object({
				solutionId: t.String(),
			}),
			params: t.Object({
				id: t.String(),
			}),
			headers: t.Object({
				"x-api-key": t.Optional(t.String()),
			}),
			detail: {
				summary: "Mark a message as a solution",
				tags: ["Messages"],
				security: [{ apiKey: [] }],
			},
		},
	);

export const GET = app.fetch;
export const POST = app.fetch;
export const PUT = app.fetch;
export const DELETE = app.fetch;
export const PATCH = app.fetch;
