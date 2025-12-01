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
			value: "https://answeroverflow.com",
		});
	}

	if (
		channelSettings.flags.indexingEnabled &&
		!channelSettings.flags.forumGuidelinesConsentEnabled &&
		!serverPreferences?.considerAllMessagesPublicEnabled
	) {
		embed.setDescription(
			[
				`**Thank you for marking this question as solved!**`,
				`Want to help others find the answer to this question? Use the button below to display your messages in ${server.name} on the web!`,
			].join("\n\n"),
		);
	} else {
		embed.setDescription("**Thank you for marking this question as solved!**");
	}

	components.addComponents(
		new ButtonBuilder()
			.setLabel("Jump To Solution")
			.setURL(solution.url)
			.setStyle(ButtonStyle.Link),
	);

	if (channelSettings.flags.indexingEnabled) {
		components.addComponents(
			new ButtonBuilder()
				.setLabel(
					serverPreferences?.customDomain
						? `View on ${server.name}`
						: "View on Answer Overflow",
				)
				.setURL(makeMainSiteLink(`/m/${solution.id}`))
				.setStyle(ButtonStyle.Link),
		);
	}

	return {
		embed,
		components: components.components.length > 0 ? components : undefined,
	};
}
