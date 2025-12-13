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
	console.log("[makeMarkSolutionResponse] Starting");
	console.log("[makeMarkSolutionResponse] solution.id:", solution.id);
	console.log("[makeMarkSolutionResponse] solution.url:", solution.url);
	console.log("[makeMarkSolutionResponse] server:", server);
	console.log(
		"[makeMarkSolutionResponse] serverPreferences:",
		serverPreferences,
	);
	console.log("[makeMarkSolutionResponse] channelSettings:", channelSettings);

	console.log("[makeMarkSolutionResponse] Creating ActionRowBuilder");
	const components = new ActionRowBuilder<MessageActionRowComponentBuilder>();

	console.log("[makeMarkSolutionResponse] Creating EmbedBuilder");
	const embed = new EmbedBuilder().setColor(
		ANSWER_OVERFLOW_BLUE_HEX as `#${string}`,
	);

	console.log("[makeMarkSolutionResponse] Checking customDomain");
	if (!serverPreferences?.customDomain) {
		console.log("[makeMarkSolutionResponse] Adding learn more field");
		embed.addFields({
			name: "Learn more",
			value: "https://answeroverflow.com",
		});
	}
	console.log("[makeMarkSolutionResponse] Setting description");
	embed.setDescription("**Thank you for marking this question as solved!**");

	console.log("[makeMarkSolutionResponse] Adding Jump To Solution button");
	components.addComponents(
		new ButtonBuilder()
			.setLabel("Jump To Solution")
			.setURL(solution.url)
			.setStyle(ButtonStyle.Link),
	);

	console.log("[makeMarkSolutionResponse] Checking indexingEnabled");
	if (channelSettings.flags.indexingEnabled) {
		console.log("[makeMarkSolutionResponse] Adding View on AO button");
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

	console.log("[makeMarkSolutionResponse] Returning result");
	return {
		embed,
		components: components.components.length > 0 ? components : undefined,
	};
}
