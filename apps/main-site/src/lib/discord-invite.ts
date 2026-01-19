import "server-only";

export type DiscordInviteGuild = {
	id: string;
	name: string;
	splash: string | null;
	banner: string | null;
	description: string | null;
	icon: string | null;
	features: string[];
	verification_level: number;
	vanity_url_code: string | null;
	nsfw_level: number;
	nsfw: boolean;
	premium_subscription_count: number;
};

export type DiscordInviteResponse = {
	type: number;
	code: string;
	expires_at: string | null;
	guild?: DiscordInviteGuild;
	guild_id?: string;
	approximate_member_count?: number;
	approximate_presence_count?: number;
};

export type DiscordInviteData = {
	code: string;
	guildId: string;
	guildName: string;
	guildIcon: string | null;
	guildDescription: string | null;
	guildBanner: string | null;
	memberCount: number;
	onlineCount: number;
	vanityUrlCode: string | null;
};

export async function fetchDiscordInvite(
	inviteCode: string,
): Promise<DiscordInviteData | null> {
	const response = await fetch(
		`https://discord.com/api/v10/invites/${inviteCode}?with_counts=true`,
		{
			next: { revalidate: 300 },
		},
	);

	if (!response.ok) {
		return null;
	}

	const data = (await response.json()) as DiscordInviteResponse;

	if (!data.guild?.id) {
		return null;
	}

	return {
		code: data.code,
		guildId: data.guild.id,
		guildName: data.guild.name,
		guildIcon: data.guild.icon,
		guildDescription: data.guild.description,
		guildBanner: data.guild.banner,
		memberCount: data.approximate_member_count ?? 0,
		onlineCount: data.approximate_presence_count ?? 0,
		vanityUrlCode: data.guild.vanity_url_code,
	};
}

export function getDiscordIconUrl(
	guildId: string,
	iconHash: string | null,
	size = 128,
): string | null {
	if (!iconHash) return null;
	return `https://cdn.discordapp.com/icons/${guildId}/${iconHash}.png?size=${size}`;
}

export function getDiscordBannerUrl(
	guildId: string,
	bannerHash: string | null,
	size = 480,
): string | null {
	if (!bannerHash) return null;
	return `https://cdn.discordapp.com/banners/${guildId}/${bannerHash}.png?size=${size}`;
}

export function getDiscordSplashUrl(
	guildId: string,
	splashHash: string | null,
	size = 480,
): string | null {
	if (!splashHash) return null;
	return `https://cdn.discordapp.com/splashes/${guildId}/${splashHash}.png?size=${size}`;
}
