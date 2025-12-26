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
};

export type ClientEventName = keyof ClientEvents;
