export type Snowflake = string;

export type ServerProps = {
	"Server Id": Snowflake;
	"Server Name": string;
};

export type ChannelProps = {
	"Channel Id": Snowflake;
	"Channel Name": string;
	"Channel Type": number;
	"Channel Server Id"?: Snowflake;
	"Channel Invite Code"?: string;
};

export type ThreadProps = {
	"Thread Id": Snowflake;
	"Thread Name": string;
	"Thread Type": number;
	"Thread Archived Timestamp"?: number;
	"Thread Parent Id"?: Snowflake;
	"Thread Parent Name"?: string;
	"Thread Parent Type"?: number;
	"Number of Messages"?: number;
};

export type MessageProps = {
	"Message Id": Snowflake;
	"Message Author Id": Snowflake;
	"Server Id": Snowflake;
	"Channel Id": Snowflake;
	"Thread Id"?: Snowflake;
	"Solution Id"?: Snowflake;
	"Solution Author Id"?: Snowflake;
};

export type AnalyticsServer = {
	discordId: bigint;
	name: string;
};

export type AnalyticsChannel = {
	id: bigint;
	name: string;
	type: number;
	serverId?: bigint;
	inviteCode?: string | null;
};

export type AnalyticsThread = {
	id: bigint;
	name: string;
	type: number;
	archivedAt?: Date | null;
	parentId?: bigint | null;
	parentName?: string | null;
	parentType?: number | null;
	messageCount?: number | null;
};

export type AnalyticsMessage = {
	id: bigint;
	authorId: bigint;
	serverId: bigint;
	channelId: bigint;
	threadId?: bigint | null;
};

export type MessagePageViewProps = {
	server: AnalyticsServer;
	channel: AnalyticsChannel;
	thread?: AnalyticsThread | null;
	message: AnalyticsMessage;
	solutionAuthorId?: bigint | null;
};

export type CommunityPageViewProps = {
	server: AnalyticsServer;
	channel?: AnalyticsChannel | null;
};

export type HelpfulFeedbackClickProps = {
	feedback: "Yes" | "No";
	server: AnalyticsServer;
	channel: AnalyticsChannel;
	thread?: AnalyticsThread | null;
	message: AnalyticsMessage;
};

export type ServerInviteClickProps = {
	"Button Location":
		| "Search Results"
		| "Community Page"
		| "Message Result Page";
	server: AnalyticsServer;
	channel?: AnalyticsChannel | null;
	thread?: AnalyticsThread | null;
};

export type CommunityPageLinkClickProps = {
	"Link Location":
		| "Community Page"
		| "Search Results"
		| "About Marquee"
		| "Message Result Page";
	server: AnalyticsServer;
	channel?: AnalyticsChannel | null;
	thread?: AnalyticsThread | null;
};

export type ViewOnDiscordClickProps = {
	server: AnalyticsServer;
	channel: AnalyticsChannel;
	thread?: AnalyticsThread | null;
	message: AnalyticsMessage;
};

export type EventMap = {
	"Message Page View": MessagePageViewProps;
	"Community Page View": CommunityPageViewProps;
	"Helpful Feedback Click": HelpfulFeedbackClickProps;
	"Server Invite Click": ServerInviteClickProps;
	"Community Page Link Click": CommunityPageLinkClickProps;
	"View On Discord Click": ViewOnDiscordClickProps;
};

export type EventName = keyof EventMap;
