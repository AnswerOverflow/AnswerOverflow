export const NUMBER_OF_MESSAGES_FIELD_NAME = 'Number of Messages';
export type Snowflake = string;

export const MESSAGE_ID_FIELD_NAME = 'Message Id';
export const MESSAGE_AUTHOR_ID_FIELD_NAME = 'Message Author Id';
export const SOLUTION_ID_FIELD_NAME = 'Solution Id';
export const SOLUTION_AUTHOR_ID_FIELD_NAME = 'Solution Author Id';

export type MessageProps = {
	[MESSAGE_ID_FIELD_NAME]: Snowflake;
	[MESSAGE_AUTHOR_ID_FIELD_NAME]: Snowflake;
	[SOLUTION_ID_FIELD_NAME]?: Snowflake;
	[SOLUTION_AUTHOR_ID_FIELD_NAME]?: Snowflake;
};

export const SERVER_ID_FIELD_NAME = 'Server Id';
export const SERVER_NAME_FIELD_NAME = 'Server Name';
export type ServerProps = {
	[SERVER_ID_FIELD_NAME]: Snowflake;
	[SERVER_NAME_FIELD_NAME]: string;
};

export const CHANNEL_ID_FIELD_NAME = 'Channel Id';
export const CHANNEL_NAME_FIELD_NAME = 'Channel Name';
export type ChannelProps = {
	[CHANNEL_ID_FIELD_NAME]: Snowflake;
	[CHANNEL_NAME_FIELD_NAME]: string;
};

export const THREAD_ID_FIELD_NAME = 'Thread Id';
export const THREAD_NAME_FIELD_NAME = 'Thread Name';
export type ThreadProps = {
	[THREAD_ID_FIELD_NAME]: Snowflake;
	[THREAD_NAME_FIELD_NAME]: string;
};

export const JOIN_WAITLIST_EVENT_NAME = 'Join Waitlist Click';
export type JoinWaitlistClickProps = {
	'Button Location': 'Pricing Page' | 'Experimental Settings Menu';
};
