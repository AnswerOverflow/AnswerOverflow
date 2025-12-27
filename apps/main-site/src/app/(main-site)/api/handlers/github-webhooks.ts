import { createHmac, timingSafeEqual } from "node:crypto";
import { api } from "@packages/database/convex/_generated/api";
import { ConvexHttpClient } from "convex/browser";
import type { Context } from "elysia";
import { z } from "zod";

function getGitHubWebhookSecret(): string {
	const secret = process.env.GITHUB_WEBHOOK_SECRET;
	if (!secret) {
		throw new Error("GITHUB_WEBHOOK_SECRET environment variable is required");
	}
	return secret;
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

function verifyGitHubSignature(
	payload: string,
	signature: string | null,
	secret: string,
): boolean {
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
}

async function sendDiscordNotification(
	channelId: string,
	threadId: string | undefined,
	message: string,
): Promise<void> {
	const botToken = process.env.DISCORD_BOT_TOKEN;
	if (!botToken) {
		console.error("DISCORD_BOT_TOKEN not set, cannot send notification");
		return;
	}

	const targetId = threadId ?? channelId;

	const response = await fetch(
		`https://discord.com/api/v10/channels/${targetId}/messages`,
		{
			method: "POST",
			headers: {
				Authorization: `Bot ${botToken}`,
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				content: message,
			}),
		},
	);

	if (!response.ok) {
		const errorText = await response.text().catch(() => "");
		console.error("Failed to send Discord notification:", {
			status: response.status,
			error: errorText,
		});
	}
}

export async function handleGitHubWebhook(c: Context) {
	try {
		const signature = c.request.headers.get("x-hub-signature-256");
		const eventType = c.request.headers.get("x-github-event");

		const rawBody = await c.request.text();

		if (!verifyGitHubSignature(rawBody, signature, getGitHubWebhookSecret())) {
			console.warn("GitHub webhook signature verification failed");
			return Response.json({ error: "Invalid signature" }, { status: 401 });
		}

		if (eventType !== "issues") {
			return Response.json({ message: "Event ignored", event: eventType });
		}

		const parseResult = githubIssueEventSchema.safeParse(JSON.parse(rawBody));
		if (!parseResult.success) {
			console.error("Invalid webhook payload:", parseResult.error);
			return Response.json({ error: "Invalid payload" }, { status: 400 });
		}

		const payload = parseResult.data;

		if (payload.action !== "closed" && payload.action !== "reopened") {
			return Response.json({
				message: "Action ignored",
				action: payload.action,
			});
		}

		const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
		if (!convexUrl) {
			console.error("NEXT_PUBLIC_CONVEX_URL not set");
			return Response.json({ error: "Convex not configured" }, { status: 500 });
		}

		const client = new ConvexHttpClient(convexUrl);

		const backendAccessToken = process.env.BACKEND_ACCESS_TOKEN;
		if (!backendAccessToken) {
			console.error("BACKEND_ACCESS_TOKEN not set");
			return Response.json(
				{ error: "Backend token not configured" },
				{ status: 500 },
			);
		}

		const repoOwner = payload.repository.owner.login;
		const repoName = payload.repository.name;
		const issueNumber = payload.issue.number;

		const issue = await client.query(
			api.private.github.getGitHubIssueByRepoAndNumber,
			{
				backendAccessToken,
				repoOwner,
				repoName,
				issueNumber,
			},
		);

		if (!issue) {
			return Response.json({
				message: "Issue not tracked by AnswerOverflow",
				repo: `${repoOwner}/${repoName}`,
				issueNumber,
			});
		}

		const newStatus = payload.action === "closed" ? "closed" : "open";

		await client.mutation(api.private.github.updateGitHubIssueStatus, {
			backendAccessToken,
			repoOwner,
			repoName,
			issueNumber,
			status: newStatus,
		});

		if (payload.action === "closed") {
			const message = `✅ Issue [#${issueNumber}](${payload.issue.html_url}) was closed: **${payload.issue.title}**`;

			await sendDiscordNotification(
				issue.discordChannelId.toString(),
				issue.discordThreadId?.toString(),
				message,
			);
		}

		return Response.json({
			message: "Webhook processed",
			action: payload.action,
			issueNumber,
			repo: `${repoOwner}/${repoName}`,
		});
	} catch (error: unknown) {
		console.error("Error handling GitHub webhook", error);
		return Response.json(
			{ error: error instanceof Error ? error.message : "Unknown error" },
			{ status: 500 },
		);
	}
}
