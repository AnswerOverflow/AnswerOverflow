import type { Infer } from "convex/values";
import {
	channelSchema,
	discordAccountSchema,
	messageSchema,
	serverSchema,
} from "../schema";

export const PublicServer = serverSchema.pick(
	"discordId",
	"name",
	"icon",
	"description",
	"vanityInviteCode",
	"vanityUrl",
	"approximateMemberCount",
);

export const PublicChannel = channelSchema.pick(
	"id",
	"serverId",
	"name",
	"type",
	"parentId",
	"inviteCode",
	"archivedTimestamp",
);

export const PublicDiscordAccount = discordAccountSchema;

export const PublicMessage = messageSchema.pick(
	"id",
	"authorId",
	"serverId",
	"channelId",
	"parentChannelId",
	"childThreadId",
	"questionId",
	"referenceId",
	"applicationId",
	"interactionId",
	"webhookId",
	"content",
	"flags",
	"type",
	"pinned",
	"nonce",
	"tts",
	"embeds",
);

export type PublicServer = Infer<typeof PublicServer>;
export type PublicChannel = Infer<typeof PublicChannel>;
export type PublicDiscordAccount = Infer<typeof PublicDiscordAccount>;
export type PublicMessage = Infer<typeof PublicMessage>;
