import { snowflakeBigIntArbitrary } from "@packages/database-utils/snowflakes-test";
import * as fc from "effect/FastCheck";

export const Gen = {
	snowflake: snowflakeBigIntArbitrary,

	server: fc.record({
		discordId: snowflakeBigIntArbitrary,
		name: fc.string({ minLength: 1, maxLength: 100 }),
		approximateMemberCount: fc.integer({ min: 1, max: 1000000 }),
		icon: fc.option(fc.string(), { nil: undefined }),
		description: fc.option(fc.string(), { nil: undefined }),
		vanityInviteCode: fc.option(fc.string(), { nil: undefined }),
	}),

	channel: fc.record({
		id: snowflakeBigIntArbitrary,
		serverId: snowflakeBigIntArbitrary,
		name: fc.stringMatching(/^[a-z0-9-]{1,32}$/),
		type: fc.constantFrom(0, 2, 5, 10, 11, 12, 15),
		parentId: fc.option(snowflakeBigIntArbitrary, { nil: undefined }),
	}),

	discordAccount: fc.record({
		id: snowflakeBigIntArbitrary,
		name: fc.string({ minLength: 1, maxLength: 32 }),
		avatar: fc.option(fc.string(), { nil: undefined }),
	}),

	message: fc.record({
		id: snowflakeBigIntArbitrary,
		authorId: snowflakeBigIntArbitrary,
		serverId: snowflakeBigIntArbitrary,
		channelId: snowflakeBigIntArbitrary,
		content: fc.string({ minLength: 0, maxLength: 2000 }),
		parentChannelId: fc.option(snowflakeBigIntArbitrary, { nil: undefined }),
		childThreadId: fc.option(snowflakeBigIntArbitrary, { nil: undefined }),
		questionId: fc.option(snowflakeBigIntArbitrary, { nil: undefined }),
		referenceId: fc.option(snowflakeBigIntArbitrary, { nil: undefined }),
	}),

	serverPreferences: fc.record({
		serverId: snowflakeBigIntArbitrary,
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
		channelId: snowflakeBigIntArbitrary,
		indexingEnabled: fc.boolean(),
		markSolutionEnabled: fc.boolean(),
		sendMarkSolutionInstructionsInNewThreads: fc.boolean(),
		autoThreadEnabled: fc.boolean(),
		forumGuidelinesConsentEnabled: fc.boolean(),
	}),
};
