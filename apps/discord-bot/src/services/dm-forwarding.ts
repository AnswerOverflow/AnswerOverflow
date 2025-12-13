import { EmbedBuilder } from "discord.js";
import { Console, Effect, Layer } from "effect";
import { SUPER_USER_ID } from "../constants/super-user";
import { Discord } from "../core/discord-service";

export const DMForwardingHandlerLayer = Layer.scopedDiscard(
	Effect.gen(function* () {
		const discord = yield* Discord;

		yield* discord.client.on("messageCreate", (message) =>
			Effect.gen(function* () {
				if (!message.channel.isDMBased()) {
					return;
				}

				if (message.author.bot) {
					return;
				}

				const embed = new EmbedBuilder()
					.setTitle("New DM Received")
					.setColor("#5865F2")
					.setTimestamp(message.createdAt)
					.addFields(
						{
							name: "From",
							value: `${message.author.tag} (${message.author.id})`,
							inline: false,
						},
						{
							name: "Content",
							value: message.content || "*No text content*",
							inline: false,
						},
					);

				if (message.attachments.size > 0) {
					const attachmentLinks = Array.from(message.attachments.values())
						.map((att) => `[${att.name}](${att.url})`)
						.join("\n");
					embed.addFields({
						name: "Attachments",
						value: attachmentLinks,
						inline: false,
					});
				}

				if (message.author.avatarURL()) {
					embed.setThumbnail(message.author.avatarURL());
				}

				yield* Effect.tryPromise({
					try: async () => {
						const superUser = await message.client.users.fetch(SUPER_USER_ID);
						await superUser.send({ embeds: [embed] });
					},
					catch: (error) => error,
				}).pipe(
					Effect.catchAll((error) =>
						Console.error("Failed to forward DM to super user:", error),
					),
				);
			}),
		);
	}),
);
