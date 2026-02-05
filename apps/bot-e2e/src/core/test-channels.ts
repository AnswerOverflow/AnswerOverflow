export const GUILD_NAME = "AO Integration";

export const CHANNELS = {
	MARK_SOLUTION_ENABLED: "mark-solution-enabled",
	MARK_SOLUTION_DISABLED: "mark-solution-disabled",
	AUTO_THREAD_ENABLED: "auto-thread-enabled",
	FORUM_MARK_SOLUTION: "forum-mark-solution",
	FORUM_NO_SETTINGS: "forum-no-settings",
	READ_THE_RULES: "read-the-rules",
	AI_AUTO_ANSWER: "ai-auto-answer",
	INDEXING_ENABLED: "indexing-enabled",
	INDEXING_DISABLED: "indexing-disabled",
	PLAYGROUND: "playground",
} as const;

export type ChannelName = (typeof CHANNELS)[keyof typeof CHANNELS];
