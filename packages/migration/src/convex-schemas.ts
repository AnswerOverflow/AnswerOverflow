export const generatedSchemas: Record<string, string> = {
	servers: `{"discordId": int64, "name": string, "icon": string, "description": string, "vanityInviteCode": string, "kickedTime": normalfloat64, "approximateMemberCount": normalfloat64}`,
	serverPreferences: `{"serverId": int64, "stripeCustomerId": string, "stripeSubscriptionId": string, "plan": string, "readTheRulesConsentEnabled": boolean, "considerAllMessagesPublicEnabled": boolean, "anonymizeMessagesEnabled": boolean, "customDomain": string, "subpath": string}`,
	channels: `{"id": int64, "serverId": int64, "name": string, "type": normalfloat64, "parentId": int64, "archivedTimestamp": normalfloat64}`,
	channelSettings: `{"channelId": int64, "indexingEnabled": boolean, "markSolutionEnabled": boolean, "sendMarkSolutionInstructionsInNewThreads": boolean, "autoThreadEnabled": boolean, "forumGuidelinesConsentEnabled": boolean, "solutionTagId": int64, "lastIndexedSnowflake": int64, "inviteCode": string}`,
	discordAccounts: `{"id": int64, "name": string, "avatar": string}`,
	userServerSettings: `{"serverId": int64, "userId": int64, "permissions": normalfloat64, "canPubliclyDisplayMessages": boolean, "messageIndexingDisabled": boolean, "apiKey": string, "apiCallsUsed": normalfloat64}`,
	ignoredDiscordAccounts: `{"id": int64}`,
	messages: `{"id": int64, "authorId": int64, "serverId": int64, "channelId": int64, "parentChannelId": int64, "childThreadId": int64, "questionId": int64, "referenceId": int64, "applicationId": int64, "interactionId": int64, "webhookId": int64, "content": string, "flags": normalfloat64, "type": normalfloat64, "pinned": boolean, "nonce": string, "tts": boolean}`,
	emojis: `{"id": int64, "name": string}`,
	reactions: `{"messageId": int64, "userId": int64, "emojiId": int64}`,
	attachments: `{"id": int64, "messageId": int64, "contentType": string, "filename": string, "width": normalfloat64, "height": normalfloat64, "size": normalfloat64, "description": string}`,
};
