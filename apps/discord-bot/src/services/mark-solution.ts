import type { Message } from "discord.js";
import {
	ActionRowBuilder,
	ButtonBuilder,
	ButtonStyle,
	EmbedBuilder,
	type MessageActionRowComponentBuilder,
} from "discord.js";

const ANSWER_OVERFLOW_BLUE_HEX = "#8CD1FF";

function makeMainSiteLink(path: string): string {
	const baseUrl =
		process.env.NEXT_PUBLIC_BASE_URL || "https://www.answeroverflow.com";

	return `${baseUrl}${path.startsWith("/") ? path : `/${path}`}`;
}

export function makeMarkSolutionResponse({
	solution,
	server,
	serverPreferences,
	channelSettings,
}: {
	solution: Message;
	server: { name: string; _id: string };
	serverPreferences: {
		customDomain?: string;
		considerAllMessagesPublicEnabled?: boolean;
	} | null;
	channelSettings: {
		flags: {
			indexingEnabled: boolean;
			forumGuidelinesConsentEnabled: boolean;
		};
	};
}) {
	const components = new ActionRowBuilder<MessageActionRowComponentBuilder>();

	const embed = new EmbedBuilder().setColor(
		ANSWER_OVERFLOW_BLUE_HEX as `#${string}`,
	);

	if (!serverPreferences?.customDomain) {
		embed.addFields({
			name: "Learn more",
			value: "https://answeroverflow.com/about",
		});
	}
	embed.setDescription("**Thank you for marking this question as solved!**");

	components.addComponents(
		new ButtonBuilder()
			.setLabel("Jump To Solution")
			.setURL(solution.url)
			.setStyle(ButtonStyle.Link),
	);

	if (channelSettings.flags.indexingEnabled) {
		const label = serverPreferences?.customDomain
			? `View on ${server.name}`
			: "View on Answer Overflow";
		const url = makeMainSiteLink(`/m/${solution.id}`);
		components.addComponents(
			new ButtonBuilder()
				.setLabel(label)
				.setURL(url)
				.setStyle(ButtonStyle.Link),
		);
	}

	return {
		embed,
		components: components.components.length > 0 ? components : undefined,
	};
}
