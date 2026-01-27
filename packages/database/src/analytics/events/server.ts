import type {
	AnalyticsChannelWithSettings,
	AnalyticsMember,
	AnalyticsMessageInfo,
	AnalyticsServer,
	AnalyticsServerWithSettings,
	AnalyticsThread,
	ConsentSource,
	MarkSolutionCommandStatus,
} from "../types";

export type BaseServerProps = {
	server: AnalyticsServerWithSettings;
	channel: AnalyticsChannelWithSettings;
	thread: AnalyticsThread;
	user: AnalyticsMember;
	questionAsker: AnalyticsMember;
	questionSolver: AnalyticsMember;
	markAsSolver: AnalyticsMember;
	question: AnalyticsMessageInfo;
	solution: AnalyticsMessageInfo;
	accountId: string;
};

export type BaseLightServerProps = {
	server: AnalyticsServer;
	thread: AnalyticsThread;
	user: AnalyticsMember;
	accountId: string;
};

export type ServerEvents = {
	"Server Join": Pick<BaseServerProps, "server" | "accountId">;

	"Server Leave": Pick<BaseServerProps, "server" | "accountId">;

	"User Joined Server": Pick<BaseServerProps, "server" | "user" | "accountId">;

	"User Left Server": Pick<BaseServerProps, "server" | "user" | "accountId">;

	"Asked Question": Pick<
		BaseServerProps,
		"server" | "channel" | "thread" | "questionAsker" | "question" | "accountId"
	>;

	"Solved Question": Pick<
		BaseServerProps,
		| "server"
		| "channel"
		| "thread"
		| "questionAsker"
		| "questionSolver"
		| "markAsSolver"
		| "question"
		| "solution"
		| "accountId"
	> & {
		"Time To Solve In Ms": number;
	};

	"Mark Solution Instructions Sent": Pick<
		BaseServerProps,
		"server" | "channel" | "thread" | "questionAsker" | "question" | "accountId"
	>;

	"Mark Solution Application Command Used": Pick<
		BaseServerProps,
		"user" | "accountId"
	> & {
		Status: MarkSolutionCommandStatus;
	};

	"Dismiss Button Clicked": Pick<BaseServerProps, "user" | "accountId"> & {
		"Dismissed Message Type": "Mark Solution Instructions";
	};

	"User Grant Consent": Pick<BaseServerProps, "user" | "accountId"> & {
		"Consent Source": ConsentSource;
	};

	"Leaderboard Viewed": Pick<BaseServerProps, "user" | "accountId">;

	"Quick Action Command Sent": Pick<BaseServerProps, "user" | "accountId">;

	"Similar Threads Button Clicked": Pick<
		BaseLightServerProps,
		"server" | "user" | "thread" | "accountId"
	> & {
		"Results Count": number;
	};

	"Similar Thread Solved Clicked": Pick<
		BaseLightServerProps,
		"server" | "user" | "thread" | "accountId"
	> & {
		"Similar Thread Id": string;
	};

	"GitHub Issue Command Used": Pick<BaseServerProps, "user" | "accountId"> & {
		"Server Id": string;
		"Channel Id": string;
		"Message Id": string;
		"Thread Id"?: string;
	};

	"GitHub Issue Created": Pick<BaseServerProps, "user" | "accountId"> & {
		"Server Id": string;
		"Channel Id": string;
		"Message Id": string;
		"Thread Id"?: string;
		"Repo Owner": string;
		"Repo Name": string;
		"Issue Number": number;
		"Issue URL": string;
		"Issues In Batch": number;
	};

	"GitHub Issue Creation Failed": Pick<
		BaseServerProps,
		"user" | "accountId"
	> & {
		"Server Id": string;
		"Channel Id": string;
		"Message Id": string;
		"Error Type": string;
		"Error Message": string;
		"Repo Owner"?: string;
		"Repo Name"?: string;
	};

	"GitHub Issue AI Extraction": Pick<BaseServerProps, "user" | "accountId"> & {
		"Server Id": string;
		"Channel Id": string;
		"Message Id": string;
		"Issues Extracted": number;
		"Used Fallback": boolean;
		"Message Length": number;
	};

	"GitHub Issue Rate Limited": Pick<BaseServerProps, "user" | "accountId"> & {
		"Server Id": string;
		"Rate Limit Type": "ai_extraction" | "issue_creation";
		"Retry After Seconds": number;
	};
};

export type ServerEventName = keyof ServerEvents;
