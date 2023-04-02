export const NUMBER_OF_MESSAGES_FIELD_NAME = 'Number of Messages';
export type Snowflake = string;

export type MessageProps = {
	'Message Id': Snowflake;
	'Message Author Id': Snowflake;
	'Solution Id'?: Snowflake;
	'Solution Author Id'?: Snowflake;
};
export type ServerProps = {
	'Server Id': Snowflake;
	'Server Name': string;
};

export type ServerWithSettingsProps = ServerProps & {
	'Server Flags': Record<string, boolean>;
	'Time In Server': number;
};

export type ChannelProps = {
	'Channel Id': Snowflake;
	'Channel Name': string;
	'Channel Type': number;
};

export type ChannelPropsWithSettings = ChannelProps & {
	'Channel Flags': Record<string, boolean>;
	'Channel Solution Tag Id'?: Snowflake;
	'Channel Invite Code'?: string;
	'Channel Server Id': Snowflake;
};

export type ThreadProps = {
	'Thread Id': Snowflake;
	'Thread Name': string;
	'Thread Type': number;
	'Thread Archived At'?: number;
	'Thread Parent Id'?: Snowflake;
	'Thread Parent Name'?: string;
	'Thread Parent Type'?: number;
};

export const JOIN_WAITLIST_EVENT_NAME = 'Join Waitlist Click';
export type JoinWaitlistClickProps = {
	'Button Location': 'Pricing Page' | 'Experimental Settings Menu';
};

export type ServerInviteClickProps = {
	'Button Location':
		| 'Search Results'
		| 'Community Page'
		| 'Message Result Page';
	'Invite Code': string;
} & ServerProps &
	ChannelProps &
	Partial<ThreadProps>;

export type ServerInviteEvent = {
	'Server Invite Click': ServerInviteClickProps;
};

export type CommunityPageLinkClickProps = {
	'Link Location':
		| 'Community Page'
		| 'Search Results'
		| 'About Marquee'
		| 'Message Result Page';
} & ServerProps &
	Partial<ChannelProps> &
	Partial<ThreadProps>;

export type CommunityPageLinkEvent = {
	'Community Page Link Click': CommunityPageLinkClickProps;
};
