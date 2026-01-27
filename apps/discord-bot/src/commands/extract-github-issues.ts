import { gateway, generateText, Output } from "ai";
import type { Message } from "discord.js";
import { Data, Effect } from "effect";
import { z } from "zod";

const ExtractionSchema = z.object({
	issues: z.array(
		z.object({
			title: z
				.string()
				.describe(
					"Concise GitHub issue title, max 80 chars. Should be actionable and specific.",
				),
			body: z
				.string()
				.describe(
					"Well-formatted GitHub issue body in markdown. Include relevant context, reproduction steps if applicable, and any referenced URLs.",
				),
		}),
	),
});

export type ExtractedIssue = z.infer<typeof ExtractionSchema>["issues"][number];

export class ExtractIssuesError extends Data.TaggedError("ExtractIssuesError")<{
	readonly message: string;
}> {}

export const extractIssuesFromMessage = (message: Message) =>
	Effect.tryPromise({
		try: async () => {
			const threadName =
				message.channel.isThread() && message.channel.name
					? message.channel.name
					: null;

			const context = [
				threadName ? `Thread: "${threadName}"` : null,
				`Author: ${message.author.username}`,
				message.channel.isThread() && message.channel.parent
					? `Channel: #${message.channel.parent.name}`
					: null,
			]
				.filter(Boolean)
				.join("\n");

			const result = await generateText({
				model: gateway("google/gemini-2.0-flash"),
				output: Output.object({ schema: ExtractionSchema }),
				prompt: `You are extracting GitHub issues from a Discord message. Analyze the message and create well-structured GitHub issues.

For each issue:
- Title: Clear, concise, actionable (max 80 chars). Use conventional formats like "Fix: ...", "Add: ...", "Bug: ..." when appropriate.
- Body: Well-structured markdown using these sections as appropriate:
  - **Description** — What the issue is about, written clearly and directly
  - **Steps to Reproduce** — If it's a bug, include numbered steps
  - **Expected Behavior** — What should happen
  - **Actual Behavior** — What actually happens
  - **Additional Context** — Any relevant URLs, code snippets, or references from the message

Skip sections that don't apply. Keep the body concise but complete.

If the message contains multiple distinct issues, extract each separately. If it's a single issue, return just one.

Write as if you're filing the issue directly — no meta-commentary like "the user said".

Context:
${context}

Message content:
${message.content}`,
			});

			if (!result.output) {
				throw new Error("AI did not return structured output");
			}

			return result.output.issues;
		},
		catch: (error) =>
			new ExtractIssuesError({
				message:
					error instanceof Error ? error.message : "Failed to extract issues",
			}),
	});
