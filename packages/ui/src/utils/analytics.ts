type Channel = {
	id: bigint;
	name: string;
	type: number;
};

type Server = {
	discordId: bigint;
	name: string;
	approximateMemberCount?: number;
};

type Thread = {
	id: bigint;
	name: string;
	type: number;
};

type Message = {
	id: bigint;
	authorId: bigint | string;
	serverId: bigint;
	channelId: bigint;
};

export function channelToAnalyticsData(channel: Channel) {
	return {
		"Channel ID": channel.id.toString(),
		"Channel Name": channel.name,
		"Channel Type": channel.type,
	};
}

export function serverToAnalyticsData(server: Server) {
	return {
		"Server ID": server.discordId.toString(),
		"Server Name": server.name,
		...(server.approximateMemberCount && {
			"Server Member Count": server.approximateMemberCount,
		}),
	};
}

export function threadToAnalyticsData(thread: Thread) {
	return {
		"Thread ID": thread.id.toString(),
		"Thread Name": thread.name,
		"Thread Type": thread.type,
	};
}

export function messageWithDiscordAccountToAnalyticsData(message: Message) {
	return {
		"Message ID": message.id.toString(),
		"Author ID":
			typeof message.authorId === "bigint"
				? message.authorId.toString()
				: message.authorId,
		"Server ID": message.serverId.toString(),
		"Channel ID": message.channelId.toString(),
	};
}
