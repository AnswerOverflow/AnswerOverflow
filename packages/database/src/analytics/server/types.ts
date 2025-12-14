export type BaseProps = {
	"Answer Overflow Account Id": string;
};

export const userTypes = [
	"User",
	"Question Asker",
	"Question Solver",
	"Mark As Solver",
] as const;

export type UserType = (typeof userTypes)[number];

export type UserProps<T extends UserType> = {
	[K in
		| `${T} Id`
		| `${T} Joined At`
		| `${T} Time In Server In Ms`]: K extends `${T} Id`
		? string
		: number | undefined;
};

export const messageTypes = ["Message", "Question", "Solution"] as const;

export type MessageType = (typeof messageTypes)[number];

export type MessageProps<T extends MessageType> = {
	[K in
		| `${T} Id`
		| `${T} Created At`
		| `${T} Content Length`
		| `${T} Server Id`
		| `${T} Channel Id`
		| `${T} Thread Id`]: K extends `${T} Id` ? string : number | undefined;
};

export type ServerProps = {
	"Server Id": string;
	"Server Name": string;
};

export type ServerPropsWithSettings = ServerProps & {
	"Read the Rules Consent Enabled": boolean;
};

export type ServerPropsWithDiscordData = ServerPropsWithSettings & {
	"Bot Time In Server In Ms": number;
};

export type ChannelProps = {
	"Channel Id": string;
	"Channel Name": string;
	"Channel Type": number;
	"Channel Server Id": string;
	"Channel Invite Code"?: string;
};

export type ChannelPropsWithSettings = ChannelProps & {
	"Channel Solution Tag Id"?: string;
	"Indexing Enabled": boolean;
	"Mark Solution Enabled": boolean;
	"Send Mark Solution Instructions In New Threads Enabled": boolean;
	"Auto Thread Enabled": boolean;
	"Forum Guidelines Consent Enabled": boolean;
};

export type ChannelPropsWithDiscordData = ChannelPropsWithSettings;

export type ThreadProps = {
	"Thread Id": string;
	"Thread Name": string;
	"Thread Type": number;
	"Number of Messages"?: number;
	"Thread Archived Timestamp"?: number;
	"Thread Parent Id"?: string;
	"Thread Parent Name"?: string;
	"Thread Parent Type"?: number;
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

export type ServerJoinProps = ServerPropsWithDiscordData;
export type ServerLeaveProps = ServerPropsWithDiscordData;
export type UserJoinedServerProps = ServerPropsWithDiscordData &
	UserProps<"User">;
export type UserLeftServerProps = ServerPropsWithDiscordData &
	UserProps<"User">;

export type QuestionAskedProps = ServerPropsWithDiscordData &
	ChannelPropsWithDiscordData &
	ThreadProps &
	UserProps<"Question Asker"> &
	Partial<MessageProps<"Question">>;

export type QuestionSolvedProps = QuestionAskedProps &
	UserProps<"Question Solver"> &
	UserProps<"Mark As Solver"> &
	MessageProps<"Solution"> & {
		"Time To Solve In Ms": number;
	};

export type MarkSolutionUsedProps = UserProps<"User"> & {
	Status: MarkSolutionCommandStatus;
};

export type LeaderboardViewedProps = UserProps<"User">;

export type QuickActionCommandSentProps = UserProps<"User">;

export type MarkSolutionInstructionsSentProps = QuestionAskedProps;

export type DismissButtonClickedProps = UserProps<"User"> &
	MessageProps<"Message"> & {
		"Dismissed Message Type": "Mark Solution Instructions";
	};

export type UserGrantConsentProps = UserProps<"User"> & {
	"Consent Source": ConsentSource;
};
