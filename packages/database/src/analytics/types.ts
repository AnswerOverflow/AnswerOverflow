export type AnalyticsServer = {
	id: string;
	name: string;
};

export type AnalyticsServerWithSettings = AnalyticsServer & {
	readTheRulesConsentEnabled: boolean;
	botTimeInServerMs: number;
};

export type AnalyticsChannel = {
	id: string;
	name: string;
	type: number;
	serverId?: string;
	inviteCode?: string | null;
};

export type AnalyticsChannelWithSettings = AnalyticsChannel & {
	solutionTagId?: string;
	indexingEnabled: boolean;
	markSolutionEnabled: boolean;
	sendMarkSolutionInstructionsInNewThreads: boolean;
	autoThreadEnabled: boolean;
	forumGuidelinesConsentEnabled: boolean;
};

export type AnalyticsThread = {
	id: string;
	name: string;
	type: number;
	archivedTimestamp?: number;
	parentId?: string;
	parentName?: string;
	parentType?: number;
	messageCount?: number;
};

export type AnalyticsMessage = {
	id: string;
	authorId: string;
	serverId: string;
	channelId: string;
	threadId?: string;
};

export type AnalyticsMember = {
	id: string;
	joinedAt?: number;
	timeInServerMs?: number;
};

export type AnalyticsMessageInfo = {
	id: string;
	createdAt: number;
	contentLength: number;
	serverId?: string;
	channelId?: string;
	threadId?: string;
};

export const ConsentSource = {
	ForumPostGuidelines: "forum-post-guidelines",
	ReadTheRules: "read-the-rules",
	ManageAccountMenu: "manage-account-menu",
	MarkSolutionResponse: "mark-solution-response",
	ManuallyPostedPrompt: "manually-posted-prompt",
} as const;

export type ConsentSource = (typeof ConsentSource)[keyof typeof ConsentSource];

export type MarkSolutionCommandStatus = "Success" | "Error";

export type ButtonLocation =
	| "Search Results"
	| "Community Page"
	| "Message Result Page";

export type LinkLocation =
	| "Community Page"
	| "Search Results"
	| "About Marquee"
	| "Message Result Page";
