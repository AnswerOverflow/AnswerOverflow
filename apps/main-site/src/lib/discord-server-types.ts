export type CommunityServer = {
	id: string;
	name: string;
	iconUrl?: string;
	memberCount?: number;
	invite?: string;
	description?: string;
};

export type DiscordServerContext = {
	discordId: string;
	name: string;
	hasBot: boolean;
	invite?: string;
	iconUrl?: string;
	memberCount?: number;
	description?: string;
};
