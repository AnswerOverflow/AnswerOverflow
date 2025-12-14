import * as fc from "effect/FastCheck";

const snowflake = fc.bigInt({
	min: 100000000000000000n,
	max: 999999999999999999n,
});

export const Gen = {
	snowflake,

	server: fc.record({
		discordId: snowflake,
		name: fc.string({ minLength: 1, maxLength: 100 }),
		approximateMemberCount: fc.integer({ min: 1, max: 1000000 }),
		icon: fc.option(fc.string(), { nil: undefined }),
		description: fc.option(fc.string(), { nil: undefined }),
		vanityInviteCode: fc.option(fc.string(), { nil: undefined }),
	}),

	channel: fc.record({
		id: snowflake,
		serverId: snowflake,
		name: fc.stringMatching(/^[a-z0-9-]{1,32}$/),
		type: fc.constantFrom(0, 2, 5, 10, 11, 12, 15),
		parentId: fc.option(snowflake, { nil: undefined }),
	}),

	discordAccount: fc.record({
		id: snowflake,
		name: fc.string({ minLength: 1, maxLength: 32 }),
		avatar: fc.option(fc.string(), { nil: undefined }),
	}),

	message: fc.record({
		id: snowflake,
		authorId: snowflake,
		serverId: snowflake,
		channelId: snowflake,
		content: fc.string({ minLength: 0, maxLength: 2000 }),
		parentChannelId: fc.option(snowflake, { nil: undefined }),
		childThreadId: fc.option(snowflake, { nil: undefined }),
		questionId: fc.option(snowflake, { nil: undefined }),
		referenceId: fc.option(snowflake, { nil: undefined }),
	}),

	serverPreferences: fc.record({
		serverId: snowflake,
		plan: fc.constantFrom(
			"FREE",
			"STARTER",
			"ADVANCED",
			"PRO",
			"ENTERPRISE",
			"OPEN_SOURCE",
		),
		considerAllMessagesPublicEnabled: fc.option(fc.boolean(), {
			nil: undefined,
		}),
		anonymizeMessagesEnabled: fc.option(fc.boolean(), { nil: undefined }),
	}),

	channelSettings: fc.record({
		channelId: snowflake,
		indexingEnabled: fc.boolean(),
		markSolutionEnabled: fc.boolean(),
		sendMarkSolutionInstructionsInNewThreads: fc.boolean(),
		autoThreadEnabled: fc.boolean(),
		forumGuidelinesConsentEnabled: fc.boolean(),
	}),
};
