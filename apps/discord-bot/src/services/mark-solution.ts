import type { ServerPreferences } from "@packages/database/convex/schema";
import { makeMainSiteLink } from "@packages/ui/utils/links";
import type { Message } from "discord.js";
import {
	ActionRowBuilder,
	type APIButtonComponent,
	ButtonBuilder,
	ButtonStyle,
	ComponentType,
	EmbedBuilder,
	type MessageActionRowComponentBuilder,
} from "discord.js";
import { ConsentSource } from "../utils/analytics";
import { ANSWER_OVERFLOW_BLUE_HEX } from "../utils/discord-components";

const CONSENT_BUTTON_LABEL = "Publicly Display My Messages";

export const CONSENT_ACTION_PREFIX = "consent";

export function makeConsentButtonData(source: ConsentSource) {
	return {
		label: CONSENT_BUTTON_LABEL,
		style: ButtonStyle.Success,
		custom_id: `${CONSENT_ACTION_PREFIX}:${source}`,
		type: ComponentType.Button,
	} as APIButtonComponent;
}

export function makeConsentButton(source: ConsentSource) {
	return new ButtonBuilder(makeConsentButtonData(source));
}

export function makeMarkSolutionResponse({
	solution,
	server,
	serverPreferences,
	channelSettings,
}: {
	solution: Message;
	server: { name: string; _id: string };
	serverPreferences: ServerPreferences | null;
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

	const shouldShowConsentButton =
		channelSettings.flags.indexingEnabled &&
		!channelSettings.flags.forumGuidelinesConsentEnabled &&
		!serverPreferences?.readTheRulesConsentEnabled &&
		!serverPreferences?.considerAllMessagesPublicEnabled;

	if (shouldShowConsentButton) {
		embed.setDescription(
			[
				"**Thank you for marking this question as solved!**",
				`Want to help others find the answer to this question? Use the button below to display your messages in ${server.name} on the web!`,
			].join("\n\n"),
		);
		components.addComponents(
			makeConsentButton(ConsentSource.MarkSolutionResponse),
		);
	} else {
		embed.setDescription("**Thank you for marking this question as solved!**");
	}

	if (!serverPreferences?.customDomain) {
		embed.addFields({
			name: "Learn more",
			value: "https://answeroverflow.com/about",
		});
	}

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
