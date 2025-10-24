import { DiscordAccountPublic } from '../zodSchemas/discordAccountSchemas';
import { anonymizeDiscordAccount } from './anonymization';

/**
 * Hides or replaces mentions of users who have opted out of being displayed publicly.
 * This function processes message content to replace @username mentions with anonymized names
 * for users who have not consented to public display.
 * 
 * @param content - The message content to process
 * @param mentionedUsers - Map of user IDs to their account data and privacy settings
 * @param serverId - The server ID for context
 * @returns Processed content with mentions hidden/replaced as needed
 */
export function hideMentionsForPrivacy(
	content: string,
	mentionedUsers: Map<string, {
		account: DiscordAccountPublic;
		canPubliclyDisplayMessages: boolean;
		seed: string;
	}>,
	serverId: string,
): string {
	// Pattern to match @username mentions in the content
	// This matches Discord's cleanContent format where mentions are converted to @username
	const mentionPattern = /@([a-zA-Z0-9_]+)/g;
	
	return content.replace(mentionPattern, (match, username) => {
		// Find the user by username in the mentioned users map
		const userEntry = Array.from(mentionedUsers.values()).find(
			({ account }) => account.name === username
		);
		
		if (!userEntry) {
			// User not found in our map, keep the original mention
			return match;
		}
		
		// If user has not consented to public display, replace with anonymized name
		if (!userEntry.canPubliclyDisplayMessages) {
			const anonymizedAccount = anonymizeDiscordAccount(
				userEntry.account,
				userEntry.seed
			);
			return `@${anonymizedAccount.name}`;
		}
		
		// User has consented, keep the original mention
		return match;
	});
}

/**
 * Extracts mentioned users from message content and their privacy settings.
 * This is a helper function to build the mentionedUsers map for hideMentionsForPrivacy.
 * 
 * @param content - The message content to analyze
 * @param allUsers - Map of all users in the server with their privacy settings
 * @returns Map of mentioned users with their account data and privacy settings
 */
export function extractMentionedUsers(
	content: string,
	allUsers: Map<string, {
		account: DiscordAccountPublic;
		canPubliclyDisplayMessages: boolean;
		seed: string;
	}>,
): Map<string, {
	account: DiscordAccountPublic;
	canPubliclyDisplayMessages: boolean;
	seed: string;
}> {
	const mentionedUsers = new Map<string, {
		account: DiscordAccountPublic;
		canPubliclyDisplayMessages: boolean;
		seed: string;
	}>();
	
	const mentionPattern = /@([a-zA-Z0-9_]+)/g;
	let match;
	
	while ((match = mentionPattern.exec(content)) !== null) {
		const username = match[1];
		
		// Find the user by username
		const userEntry = Array.from(allUsers.values()).find(
			({ account }) => account.name === username
		);
		
		if (userEntry) {
			mentionedUsers.set(userEntry.account.id, userEntry);
		}
	}
	
	return mentionedUsers;
}
