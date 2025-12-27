import type { Context } from "elysia";

export async function handleGitHubWebhook(_c: Context) {
	return Response.json(
		{ error: "GitHub webhook handler not yet implemented" },
		{ status: 200 },
	);
}

// This file has been commented out as per PR review comment.
// Will be replaced with a typesafe client to call into the Discord bot.
// Keeping the code for reference during the migration.

/*
import { createHmac, timingSafeEqual } from "node:crypto";
import { Database } from "@packages/database/database";
import type { ConvexError } from "@packages/database/database";
import { Data, Effect } from "effect";
import type { Context } from "elysia";
import { z } from "zod";
import { runtime } from "../../../../lib/runtime";

const MAX_WEBHOOK_BODY_SIZE = 1024 * 1024;

class PayloadTooLargeError extends Data.TaggedError("PayloadTooLargeError")<{
	readonly contentLength: number;
	readonly maxSize: number;
}> {}

class InvalidSignatureError extends Data.TaggedError("InvalidSignatureError")<{
	readonly deliveryId: string | null;
}> {}

class InvalidJsonError extends Data.TaggedError("InvalidJsonError")<{
	readonly message: string;
}> {}

class InvalidPayloadError extends Data.TaggedError("InvalidPayloadError")<{
	readonly errors: z.ZodIssue[];
}> {}

class MissingConfigError extends Data.TaggedError("MissingConfigError")<{
	readonly configName: string;
}> {}

class DiscordNotificationError extends Data.TaggedError(
	"DiscordNotificationError",
)<{
	readonly status: number;
	readonly error: string;
}> {}

type WebhookError =
	| PayloadTooLargeError
	| InvalidSignatureError
	| InvalidJsonError
	| InvalidPayloadError
	| MissingConfigError
	| ConvexError
	| DiscordNotificationError;

type WebhookResult =
	| { type: "ignored"; event?: string; action?: string }
	| { type: "not_tracked"; repo: string; issueNumber: number }
	| {
			type: "processed";
			action: string;
			issueNumber: number;
			repo: string;
	  };

function log(
	level: "info" | "warn" | "error",
	message: string,
	data?: Record<string, unknown>,
) {
	const logEntry = {
		timestamp: new Date().toISOString(),
		level,
		service: "github-webhook",
		message,
		...data,
	};
	if (level === "error") {
		console.error(JSON.stringify(logEntry));
	} else if (level === "warn") {
		console.warn(JSON.stringify(logEntry));
	} else {
		console.log(JSON.stringify(logEntry));
	}
}

const githubIssueEventSchema = z.object({
	action: z.enum(["opened", "closed", "reopened", "edited", "deleted"]),
	issue: z.object({
		id: z.number(),
		number: z.number(),
		title: z.string(),
		html_url: z.string(),
		state: z.enum(["open", "closed"]),
	}),
	repository: z.object({
		id: z.number(),
		name: z.string(),
		full_name: z.string(),
		owner: z.object({
			login: z.string(),
		}),
	}),
});

type GitHubIssueEvent = z.infer<typeof githubIssueEventSchema>;

const verifyGitHubSignature = (
	payload: string,
	signature: string | null,
	secret: string,
): boolean => {
	if (!signature) return false;

	const [algorithm, hash] = signature.split("=");
	if (algorithm !== "sha256" || !hash) return false;

	const expectedSignature = createHmac("sha256", secret)
		.update(payload)
		.digest("hex");

	try {
		return timingSafeEqual(
			Buffer.from(hash, "hex"),
			Buffer.from(expectedSignature, "hex"),
		);
	} catch {
		return false;
	}
};

const getRequiredEnv = (
	name: string,
): Effect.Effect<string, MissingConfigError> =>
	Effect.gen(function* () {
		const value = process.env[name];
		if (!value) {
			return yield* new MissingConfigError({ configName: name });
		}
		return value;
	});

const parseJsonBody = (
	rawBody: string,
): Effect.Effect<unknown, InvalidJsonError> =>
	Effect.try({
		try: () => JSON.parse(rawBody),
		catch: (error) =>
			new InvalidJsonError({
				message: error instanceof Error ? error.message : "Invalid JSON",
			}),
	});

const validatePayload = (
	data: unknown,
): Effect.Effect<GitHubIssueEvent, InvalidPayloadError> =>
	Effect.gen(function* () {
		const result = githubIssueEventSchema.safeParse(data);
		if (!result.success) {
			return yield* new InvalidPayloadError({ errors: result.error.errors });
		}
		return result.data;
	});

const sendDiscordNotification = (
	channelId: string,
	threadId: string | undefined,
	message: string,
): Effect.Effect<void, DiscordNotificationError | MissingConfigError> =>
	Effect.gen(function* () {
		const botToken = process.env.DISCORD_BOT_TOKEN;

		if (!botToken) {
			log("warn", "DISCORD_BOT_TOKEN not set, skipping notification");
			return;
		}

		const targetId = threadId ?? channelId;

		const response = yield* Effect.tryPromise({
			try: () =>
				fetch(`https://discord.com/api/v10/channels/${targetId}/messages`, {
					method: "POST",
					headers: {
						Authorization: `Bot ${botToken}`,
						"Content-Type": "application/json",
					},
					body: JSON.stringify({ content: message }),
				}),
			catch: (error) =>
				new DiscordNotificationError({
					status: 0,
					error: error instanceof Error ? error.message : "Network error",
				}),
		});

		if (!response.ok) {
			const errorText = yield* Effect.tryPromise({
				try: () => response.text(),
				catch: () =>
					new DiscordNotificationError({ status: response.status, error: "" }),
			});
			log("warn", "Failed to send Discord notification", {
				status: response.status,
				error: errorText,
			});
		}
	});

const processWebhook = (
	requestId: string,
	rawBody: string,
	signature: string | null,
	eventType: string | null,
	deliveryId: string | null,
): Effect.Effect<WebhookResult, WebhookError, Database> =>
	Effect.gen(function* () {
		log("info", "Received GitHub webhook", {
			requestId,
			deliveryId,
			eventType,
		});

		if (rawBody.length > MAX_WEBHOOK_BODY_SIZE) {
			return yield* new PayloadTooLargeError({
				contentLength: rawBody.length,
				maxSize: MAX_WEBHOOK_BODY_SIZE,
			});
		}

		const secret = yield* getRequiredEnv("GITHUB_WEBHOOK_SECRET");

		if (!verifyGitHubSignature(rawBody, signature, secret)) {
			return yield* new InvalidSignatureError({ deliveryId });
		}

		if (eventType !== "issues") {
			log("info", "Ignoring non-issues event", { requestId, eventType });
			return { type: "ignored" as const, event: eventType ?? undefined };
		}

		const jsonData = yield* parseJsonBody(rawBody);
		const payload = yield* validatePayload(jsonData);

		const repoOwner = payload.repository.owner.login;
		const repoName = payload.repository.name;
		const issueNumber = payload.issue.number;

		log("info", "Processing issue event", {
			requestId,
			action: payload.action,
			repo: `${repoOwner}/${repoName}`,
			issueNumber,
		});

		if (payload.action !== "closed" && payload.action !== "reopened") {
			log("info", "Ignoring action", { requestId, action: payload.action });
			return { type: "ignored" as const, action: payload.action };
		}

		const database = yield* Database;

		const issue = yield* database.private.github.getGitHubIssueByRepoAndNumber(
			{ repoOwner, repoName, issueNumber },
			{ subscribe: false },
		);

		if (!issue) {
			log("info", "Issue not tracked", {
				requestId,
				repo: `${repoOwner}/${repoName}`,
				issueNumber,
			});
			return {
				type: "not_tracked" as const,
				repo: `${repoOwner}/${repoName}`,
				issueNumber,
			};
		}

		const newStatus = payload.action === "closed" ? "closed" : "open";

		yield* database.private.github.updateGitHubIssueStatus({
			repoOwner,
			repoName,
			issueNumber,
			status: newStatus,
		});

		log("info", "Updated issue status", { requestId, issueNumber, newStatus });

		if (payload.action === "closed") {
			const message = `✅ Issue [#${issueNumber}](${payload.issue.html_url}) was closed: **${payload.issue.title}**`;

			yield* sendDiscordNotification(
				issue.discordChannelId.toString(),
				issue.discordThreadId?.toString(),
				message,
			).pipe(
				Effect.catchAll((error) => {
					log("warn", "Discord notification failed", {
						requestId,
						error: error._tag,
					});
					return Effect.void;
				}),
			);

			log("info", "Sent Discord notification", {
				requestId,
				channelId: issue.discordChannelId.toString(),
				threadId: issue.discordThreadId?.toString(),
			});
		}

		log("info", "Webhook processed successfully", {
			requestId,
			action: payload.action,
			issueNumber,
			repo: `${repoOwner}/${repoName}`,
		});

		return {
			type: "processed" as const,
			action: payload.action,
			issueNumber,
			repo: `${repoOwner}/${repoName}`,
		};
	});

const errorToResponse = (error: WebhookError, requestId: string): Response => {
	switch (error._tag) {
		case "PayloadTooLargeError":
			log("warn", "Webhook body too large", {
				requestId,
				contentLength: error.contentLength,
				maxSize: error.maxSize,
			});
			return Response.json({ error: "Payload too large" }, { status: 413 });

		case "InvalidSignatureError":
			log("warn", "Signature verification failed", {
				requestId,
				deliveryId: error.deliveryId,
			});
			return Response.json({ error: "Invalid signature" }, { status: 401 });

		case "InvalidJsonError":
			log("warn", "Invalid JSON in webhook body", {
				requestId,
				message: error.message,
			});
			return Response.json({ error: "Invalid JSON" }, { status: 400 });

		case "InvalidPayloadError":
			log("error", "Invalid webhook payload", {
				requestId,
				errors: error.errors,
			});
			return Response.json({ error: "Invalid payload" }, { status: 400 });

		case "MissingConfigError":
			log("error", `${error.configName} not set`, { requestId });
			return Response.json(
				{ error: `${error.configName} not configured` },
				{ status: 500 },
			);

		case "ConvexError":
			log("error", "Convex query failed", {
				requestId,
				cause: String(error.cause),
			});
			return Response.json({ error: "Database error" }, { status: 500 });

		case "DiscordNotificationError":
			log("error", "Discord notification failed", {
				requestId,
				status: error.status,
				error: error.error,
			});
			return Response.json(
				{ error: "Discord notification failed" },
				{ status: 500 },
			);

		default: {
			const _exhaustiveCheck: never = error;
			log("error", "Unknown error type", {
				requestId,
				error: String(_exhaustiveCheck),
			});
			return Response.json({ error: "Internal server error" }, { status: 500 });
		}
	}
};

const resultToResponse = (result: WebhookResult): Response => {
	switch (result.type) {
		case "ignored":
			return Response.json({
				message: result.action ? "Action ignored" : "Event ignored",
				...(result.event && { event: result.event }),
				...(result.action && { action: result.action }),
			});

		case "not_tracked":
			return Response.json({
				message: "Issue not tracked by AnswerOverflow",
				repo: result.repo,
				issueNumber: result.issueNumber,
			});

		case "processed":
			return Response.json({
				message: "Webhook processed",
				action: result.action,
				issueNumber: result.issueNumber,
				repo: result.repo,
			});
	}
};

export async function handleGitHubWebhook(c: Context) {
	const requestId = crypto.randomUUID();

	const contentLength = c.request.headers.get("content-length");
	if (
		contentLength &&
		Number.parseInt(contentLength, 10) > MAX_WEBHOOK_BODY_SIZE
	) {
		log("warn", "Webhook body too large (from header)", {
			requestId,
			contentLength,
			maxSize: MAX_WEBHOOK_BODY_SIZE,
		});
		return Response.json({ error: "Payload too large" }, { status: 413 });
	}

	const signature = c.request.headers.get("x-hub-signature-256");
	const eventType = c.request.headers.get("x-github-event");
	const deliveryId = c.request.headers.get("x-github-delivery");

	const rawBody = await c.request.text();

	return processWebhook(
		requestId,
		rawBody,
		signature,
		eventType,
		deliveryId,
	).pipe(
		Effect.map(resultToResponse),
		Effect.catchAll((error) =>
			Effect.succeed(errorToResponse(error, requestId)),
		),
		runtime.runPromise,
	);
}
*/
