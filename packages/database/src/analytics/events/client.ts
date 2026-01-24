import type {
	AnalyticsChannel,
	AnalyticsMessage,
	AnalyticsServer,
	AnalyticsThread,
	ButtonLocation,
	LinkLocation,
} from "../types";

export type BaseClientProps = {
	server: AnalyticsServer;
	channel: AnalyticsChannel;
	thread: AnalyticsThread;
	message: AnalyticsMessage;
};

export type ClientEvents = {
	"Message Page View": Pick<
		BaseClientProps,
		"server" | "channel" | "message"
	> & {
		thread?: AnalyticsThread | null;
		solutionAuthorId?: string | null;
	};
	"Community Page View": Pick<BaseClientProps, "server"> & {
		channel?: AnalyticsChannel | null;
	};
	"Helpful Feedback Click": Pick<
		BaseClientProps,
		"server" | "channel" | "message"
	> & {
		feedback: "Yes" | "No";
		thread?: AnalyticsThread | null;
	};
	"Server Invite Click": Pick<BaseClientProps, "server"> & {
		"Button Location": ButtonLocation;
		channel?: AnalyticsChannel | null;
		thread?: AnalyticsThread | null;
	};
	"Community Page Link Click": Pick<BaseClientProps, "server"> & {
		"Link Location": LinkLocation;
		channel?: AnalyticsChannel | null;
		thread?: AnalyticsThread | null;
	};
	"View On Discord Click": Pick<
		BaseClientProps,
		"server" | "channel" | "message"
	> & {
		thread?: AnalyticsThread | null;
	};
	"MCP URL Copy Click": {
		url: string;
	};
	"MCP Install Copy Click": {
		provider: string;
		url: string;
	};
	"MCP Provider Select": {
		provider: string;
	};
	"Feedback Submitted": {
		feedback: string;
		page: string;
	};
	"Chat Message Sent": {
		threadId: string | null;
		repoOwner: string | null;
		repoName: string | null;
		modelId: string;
		isNewThread: boolean;
	};
	"Chat Model Changed": {
		modelId: string;
		previousModelId: string | null;
	};
	"Chat Repo Selected": {
		repoOwner: string;
		repoName: string;
	};
	"Chat Thread Selected": {
		threadId: string;
	};
	"Chat New Thread Click": Record<string, never>;
	"Chat Discord CTA Click": {
		repoOwner?: string;
		repoName?: string;
		serverName?: string;
	};
	"Chat Discord CTA Copy Message": {
		repoOwner?: string;
		repoName?: string;
		serverName?: string;
	};
	"Chat Discord CTA Join": {
		repoOwner?: string;
		repoName?: string;
		inviteCode?: string;
		serverName?: string;
		inviteUrl?: string;
	};
	"Chat Sign In Click": {
		location: "rate_limit_warning";
	};
	"Chat Copy Message Click": {
		threadId: string | null;
	};
	"Invite Page Copy Message": {
		serverName: string;
		guildId: string;
	};
	"Invite Page Join Discord": {
		serverName: string;
		guildId: string;
		inviteUrl: string;
	};
	"Sponsor Link Click": {
		url: string | null | undefined;
		type: "github" | "other";
	};
};

export type ClientEventName = keyof ClientEvents;
