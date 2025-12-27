export type {
	ClientEventName as EventName,
	ClientEvents as EventMap,
} from "@packages/database/analytics/events/client";
export type {
	AnalyticsChannel,
	AnalyticsMessage,
	AnalyticsServer,
	AnalyticsThread,
	ButtonLocation,
	LinkLocation,
} from "@packages/database/analytics/types";

export type Snowflake = string;
export type ServerProps = { "Server Id": string; "Server Name": string };
export type ChannelProps = {
	"Channel Id": string;
	"Channel Name": string;
	"Channel Type": number;
	"Channel Server Id"?: string;
	"Channel Invite Code"?: string;
};
export type ThreadProps = {
	"Thread Id": string;
	"Thread Name": string;
	"Thread Type": number;
	"Thread Archived Timestamp"?: number;
	"Thread Parent Id"?: string;
	"Thread Parent Name"?: string;
	"Thread Parent Type"?: number;
	"Number of Messages"?: number;
};
export type MessageProps = {
	"Message Id": string;
	"Message Author Id": string;
	"Server Id": string;
	"Channel Id": string;
	"Thread Id"?: string;
	"Solution Id"?: string;
	"Solution Author Id"?: string;
};
