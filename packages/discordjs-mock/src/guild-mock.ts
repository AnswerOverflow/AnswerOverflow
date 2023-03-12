import {
	type APIGuild,
	PermissionsBitField,
	Guild,
	User,
	PermissionResolvable,
	Role,
	Client
} from "discord.js";
import type { RawRoleData } from "discord.js/typings/rawDataTypes";
import { randomSnowflake } from "@answeroverflow/discordjs-utils";
import { mockGuildMember, mockUser } from "./user-mock";
import { omit } from "@answeroverflow/utils";

export function mockGuild(client: Client, owner?: User, data: Partial<APIGuild> = {}) {
	// Create the guild
	if (!owner) {
		owner = mockUser(client);
	}
	const guildId = data.id ?? randomSnowflake().toString();
	const rawData: APIGuild = {
		id: guildId,
		owner_id: owner.id,
		verification_level: 0,
		emojis: [],
		icon: "guild icon url",
		mfa_level: 0,
		hub_type: 0,
		features: [],
		roles: [],
		name: "guild name",
		description: "guild description",
		default_message_notifications: 0,
		banner: "guild banner url",
		splash: "guild splash url",
		discovery_splash: "guild discovery splash url",
		region: "",
		afk_channel_id: null,
		afk_timeout: 60,
		explicit_content_filter: 0,
		application_id: null,
		system_channel_id: null,
		system_channel_flags: 0,
		rules_channel_id: null,
		vanity_url_code: null,
		premium_tier: 0,
		preferred_locale: "",
		public_updates_channel_id: null,
		nsfw_level: 0,
		stickers: [],
		premium_progress_bar_enabled: false,
		...omit(data, "id")
	};
	const guild = Reflect.construct(Guild, [client, rawData]) as Guild;

	// Create the default role
	mockRole(client, PermissionsBitField.Default, guild, { name: "everyone", id: guild.id });

	// Update client cache
	client.guilds.cache.set(guild.id, guild);
	mockGuildMember({ client, user: owner, guild });
	mockGuildMember({ client, user: client.user!, guild }); // it is expected that the bot is a member of the guild

	// replace guild members fetched with accessing from the cache of the fetched user id in the fetch argument
	// TODO: Remove tsignore
	// @ts-ignore
	guild.members.fetch = async (
		id:
			| string
			| {
					user: string;
			  }
	) => {
		if (typeof id === "object") {
			id = id.user;
		}
		const member = guild.members.cache.get(id);
		if (member) return Promise.resolve(member);
		return Promise.reject(new Error("Member not found"));
	};

	return guild;
}

export function mockRole(
	client: Client,
	permissions: PermissionResolvable,
	guild?: Guild,
	role: Partial<RawRoleData> = {}
) {
	if (!guild) {
		guild = mockGuild(client);
	}
	const roleData: RawRoleData = {
		color: 0,
		hoist: false,
		id: randomSnowflake().toString(),
		managed: false,
		mentionable: false,
		name: "test",
		position: 0,
		permissions: PermissionsBitField.resolve(permissions).toString(),
		...role
	};
	const createdRole = Reflect.construct(Role, [client, roleData, guild]) as Role;
	guild.roles.cache.set(createdRole.id, createdRole);
	return createdRole;
}
