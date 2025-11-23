type Channel = {
	id: string;
	name: string;
	type: number;
};

type Server = {
	discordId: string;
	name: string;
	approximateMemberCount?: number;
};

type Thread = {
	id: string;
	name: string;
	type: number;
};

type Message = {
	id: string;
	authorId: string;
	serverId: string;
	channelId: string;
};

export function channelToAnalyticsData(channel: Channel) {
	return {
		"Channel ID": channel.id,
		"Channel Name": channel.name,
		"Channel Type": channel.type,
	};
}

export function serverToAnalyticsData(server: Server) {
	return {
		"Server ID": server.discordId,
		"Server Name": server.name,
		...(server.approximateMemberCount && {
			"Server Member Count": server.approximateMemberCount,
		}),
	};
}

export function threadToAnalyticsData(thread: Thread) {
	return {
		"Thread ID": thread.id,
		"Thread Name": thread.name,
		"Thread Type": thread.type,
	};
}

export function messageWithDiscordAccountToAnalyticsData(message: Message) {
	return {
		"Message ID": message.id,
		"Author ID": message.authorId,
		"Server ID": message.serverId,
		"Channel ID": message.channelId,
	};
}
