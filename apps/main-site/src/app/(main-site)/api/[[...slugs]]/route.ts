import { openapi } from "@elysiajs/openapi";
import { Elysia, t } from "elysia";
import { handleAuth } from "../handlers/auth";
import { handleConvexWebhook } from "../handlers/convex-webhooks";
import { handleGitHubWebhook } from "../handlers/github-webhooks";
import { handleMarkSolution } from "../handlers/messages";

type JsonValue =
	| string
	| number
	| boolean
	| null
	| JsonValue[]
	| { [key: string]: JsonValue };

function transformToOpenAPI30(schema: JsonValue): JsonValue {
	if (typeof schema !== "object" || schema === null) {
		return schema;
	}

	if (Array.isArray(schema)) {
		return schema.map(transformToOpenAPI30);
	}

	const obj = schema;
	const result: { [key: string]: JsonValue } = {};

	for (const [key, value] of Object.entries(obj)) {
		if (key === "anyOf" && Array.isArray(value)) {
			const hasNull = value.some(
				(v) =>
					typeof v === "object" &&
					v !== null &&
					!Array.isArray(v) &&
					(v as { [key: string]: JsonValue }).type === "null",
			);
			const nonNullTypes = value.filter(
				(v) =>
					!(
						typeof v === "object" &&
						v !== null &&
						!Array.isArray(v) &&
						(v as { [key: string]: JsonValue }).type === "null"
					),
			);

			if (hasNull && nonNullTypes.length === 1) {
				const nonNullSchema = transformToOpenAPI30(nonNullTypes[0]!);
				if (
					typeof nonNullSchema === "object" &&
					nonNullSchema !== null &&
					!Array.isArray(nonNullSchema)
				) {
					return { ...nonNullSchema, nullable: true };
				}
			}
		}

		result[key] = transformToOpenAPI30(value);
	}

	return result;
}

const app = new Elysia({ prefix: "/api" })
	.use(
		openapi({
			exclude: {
				paths: ["/api/openapi", "/api/openapi-mintlify"],
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
	.get(
		"/openapi-mintlify",
		async ({ set }) => {
			const baseUrl =
				process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.answeroverflow.com";
			const response = await fetch(`${baseUrl}/api/openapi/json`);
			const spec = await response.json();
			const transformed = transformToOpenAPI30(spec);
			set.headers["Content-Type"] = "application/json";
			return transformed;
		},
		{
			detail: { hide: true },
		},
	)
	.post("/v1/webhooks/convex", handleConvexWebhook, {
		detail: { hide: true },
	})
	.post("/v1/webhooks/github", handleGitHubWebhook, {
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

			return { success: true };
		},
		{
			body: t.Object({
				solutionId: t.Union([t.String(), t.Null()]),
			}),
			params: t.Object({
				id: t.String(),
			}),
			headers: t.Object({
				"x-api-key": t.Optional(t.String()),
			}),
			response: {
				200: t.Object({
					success: t.Boolean(),
				}),
				400: t.Object({
					error: t.String(),
				}),
				401: t.Object({
					error: t.String(),
				}),
				403: t.Object({
					error: t.String(),
				}),
				404: t.Object({
					error: t.String(),
				}),
				500: t.Object({
					error: t.String(),
				}),
			},
			detail: {
				summary: "Update solution for a message",
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
