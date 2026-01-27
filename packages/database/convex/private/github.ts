import { v } from "convex/values";
import { Effect, Option, Stream } from "effect";
import { internal } from "../_generated/api";
import { internalAction, internalMutation } from "../client";
import {
	privateAction,
	privateMutation,
	privateQuery,
} from "../client/private";
import { githubIssueStatusValidator } from "../schema";
import { getBetterAuthUserIdByDiscordId } from "../shared/github";

export const checkAiIssueExtractionRateLimit = privateAction({
	args: {
		discordId: v.int64(),
	},
	handler: async (
		ctx,
		args,
	): Promise<{ ok: boolean; retryAfter: number | undefined }> => {
		const userId = await getBetterAuthUserIdByDiscordId(ctx, args.discordId);
		if (!userId) {
			return { ok: false, retryAfter: undefined };
		}

		return await ctx.runMutation(
			internal.internal.rateLimiter.checkAiIssueExtraction,
			{ userId },
		);
	},
});

export const createGitHubIssueRecordInternal = internalMutation({
	args: {
		issueId: v.number(),
		issueNumber: v.number(),
		repoOwner: v.string(),
		repoName: v.string(),
		issueUrl: v.string(),
		issueTitle: v.string(),
		discordServerId: v.int64(),
		discordChannelId: v.int64(),
		discordMessageId: v.int64(),
		discordThreadId: v.optional(v.int64()),
		createdByUserId: v.string(),
	},
	handler: async (ctx, args) => {
		return await ctx.db.insert("githubIssues", {
			issueId: args.issueId,
			issueNumber: args.issueNumber,
			repoOwner: args.repoOwner,
			repoName: args.repoName,
			issueUrl: args.issueUrl,
			issueTitle: args.issueTitle,
			discordServerId: args.discordServerId,
			discordChannelId: args.discordChannelId,
			discordMessageId: args.discordMessageId,
			discordThreadId: args.discordThreadId,
			createdByUserId: args.createdByUserId,
			status: "open",
		});
	},
});

export const getGitHubIssueByRepoAndNumber = privateQuery({
	args: {
		repoOwner: v.string(),
		repoName: v.string(),
		issueNumber: v.number(),
	},
	handler: async (ctx, args) => {
		return await ctx.db
			.query("githubIssues")
			.withIndex("by_repoOwner_and_repoName_and_issueNumber", (q) =>
				q
					.eq("repoOwner", args.repoOwner)
					.eq("repoName", args.repoName)
					.eq("issueNumber", args.issueNumber),
			)
			.first();
	},
});

export const updateGitHubIssueStatus = privateMutation({
	args: {
		repoOwner: v.string(),
		repoName: v.string(),
		issueNumber: v.number(),
		status: githubIssueStatusValidator,
	},
	handler: async (ctx, args) => {
		const issue = await ctx.db
			.query("githubIssues")
			.withIndex("by_repoOwner_and_repoName_and_issueNumber", (q) =>
				q
					.eq("repoOwner", args.repoOwner)
					.eq("repoName", args.repoName)
					.eq("issueNumber", args.issueNumber),
			)
			.first();

		if (!issue) {
			return null;
		}

		await ctx.db.patch(issue._id, { status: args.status });
		return issue;
	},
});

const DISCORD_INVITE_REGEX =
	/(?:discord\.gg|discord(?:app)?\.com\/invite)\/([a-zA-Z0-9-]+)/i;

const URL_REGEX = /https?:\/\/[^\s"'<>\]()]+/gi;

type DiscordInviteApiResponse = {
	guild?: {
		id: string;
		name: string;
	};
};

type ValidatedInvite = {
	code: string;
	guildId: string;
	guildName: string;
};

const validateInviteWithDiscordApi = (
	inviteCode: string,
): Effect.Effect<ValidatedInvite, Error> =>
	Effect.tryPromise({
		try: async () => {
			const response = await fetch(
				`https://discord.com/api/v10/invites/${inviteCode}`,
			);
			if (!response.ok) {
				throw new Error(`Invalid invite: ${inviteCode}`);
			}
			const data = (await response.json()) as DiscordInviteApiResponse;
			if (!data.guild?.id) {
				throw new Error(`No guild for invite: ${inviteCode}`);
			}
			return {
				code: inviteCode,
				guildId: data.guild.id,
				guildName: data.guild.name,
			};
		},
		catch: (error) =>
			error instanceof Error ? error : new Error(String(error)),
	});

const resolveUrlToDiscordInvite = (
	url: string,
): Effect.Effect<Option.Option<string>, never> =>
	Effect.gen(function* () {
		const directMatch = url.match(DISCORD_INVITE_REGEX);
		if (directMatch?.[1]) {
			return Option.some(directMatch[1]);
		}

		let currentUrl = url;
		const maxRedirects = 5;

		for (let i = 0; i < maxRedirects; i++) {
			const result = yield* Effect.tryPromise({
				try: () => fetch(currentUrl, { method: "HEAD", redirect: "manual" }),
				catch: () => new Error("Fetch failed"),
			}).pipe(Effect.option);

			if (Option.isNone(result)) {
				return Option.none();
			}

			const location = result.value.headers.get("location");
			if (!location) {
				return Option.none();
			}

			const absoluteLocation = location.startsWith("http")
				? location
				: new URL(location, currentUrl).toString();

			const discordMatch = absoluteLocation.match(DISCORD_INVITE_REGEX);
			if (discordMatch?.[1]) {
				return Option.some(discordMatch[1]);
			}

			currentUrl = absoluteLocation;
		}

		return Option.none();
	}).pipe(Effect.catchAll(() => Effect.succeed(Option.none())));

const processUrlForValidInvite = (
	url: string,
): Effect.Effect<Option.Option<ValidatedInvite>, never> =>
	Effect.gen(function* () {
		const inviteCodeOption = yield* resolveUrlToDiscordInvite(url);

		if (Option.isNone(inviteCodeOption)) {
			return Option.none();
		}

		const validated = yield* validateInviteWithDiscordApi(
			inviteCodeOption.value,
		).pipe(Effect.option);

		return validated;
	});

const findFirstValidDiscordInvite = (
	urls: Array<string>,
): Effect.Effect<Option.Option<ValidatedInvite>, never> =>
	Stream.fromIterable(urls).pipe(
		Stream.mapEffect(processUrlForValidInvite, { concurrency: 5 }),
		Stream.filterMap((opt) => opt),
		Stream.runHead,
	);

async function fetchRepoReadme(
	owner: string,
	repo: string,
): Promise<string | null> {
	const response = await fetch(
		`https://api.github.com/repos/${owner}/${repo}/readme`,
		{
			headers: {
				Accept: "application/vnd.github.raw+json",
				"X-GitHub-Api-Version": "2022-11-28",
			},
		},
	);

	if (!response.ok) {
		return null;
	}

	return response.text();
}

export type DiscordInviteInfo = {
	hasDiscordInvite: boolean;
	inviteCodes: Array<string>;
	isOnAnswerOverflow: boolean;
	serverName?: string;
};

export const fetchDiscordInviteInfoInternal = internalAction({
	args: {
		owner: v.string(),
		repo: v.string(),
	},
	returns: v.object({
		hasDiscordInvite: v.boolean(),
		inviteCodes: v.array(v.string()),
		isOnAnswerOverflow: v.boolean(),
		serverName: v.optional(v.string()),
	}),
	handler: async (ctx, args): Promise<DiscordInviteInfo> => {
		const readme = await fetchRepoReadme(args.owner, args.repo);
		if (!readme) {
			return {
				hasDiscordInvite: false,
				inviteCodes: [],
				isOnAnswerOverflow: false,
			};
		}

		const allUrls = readme.match(URL_REGEX) ?? [];
		const uniqueUrls = [...new Set(allUrls)].slice(0, 30);

		if (uniqueUrls.length === 0) {
			return {
				hasDiscordInvite: false,
				inviteCodes: [],
				isOnAnswerOverflow: false,
			};
		}

		const validInviteOption = await Effect.runPromise(
			findFirstValidDiscordInvite(uniqueUrls),
		);

		if (Option.isNone(validInviteOption)) {
			return {
				hasDiscordInvite: false,
				inviteCodes: [],
				isOnAnswerOverflow: false,
			};
		}

		const validInvite = validInviteOption.value;

		const server = await ctx.runQuery(
			internal.private.servers.getServerByDiscordIdInternal,
			{ discordId: BigInt(validInvite.guildId) },
		);

		return {
			hasDiscordInvite: true,
			inviteCodes: [validInvite.code],
			isOnAnswerOverflow: server !== null,
			serverName: validInvite.guildName,
		};
	},
});
