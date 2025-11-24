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
