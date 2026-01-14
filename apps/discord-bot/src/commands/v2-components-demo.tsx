import {
	ActionRow,
	Attachment,
	Button,
	Container,
	File,
	Link,
	MediaGallery,
	MediaGalleryItem,
	Reacord,
	Section,
	Separator,
	TextDisplay,
} from "@packages/reacord";
import type { ChatInputCommandInteraction, TextChannel } from "discord.js";
import { MessageFlags } from "discord.js";
import { Effect, Layer, Metric } from "effect";
import { SUPER_USER_ID } from "../constants/super-user";
import { Discord } from "../core/discord-service";
import { commandExecuted } from "../metrics";
import { catchAllWithReport } from "../utils/error-reporting";

const DEMO_CONFIG = `{
  "name": "Discord Components V2 Demo",
  "version": "1.0.0",
  "components": [
    "Container",
    "TextDisplay",
    "Section",
    "Separator",
    "MediaGallery",
    "File",
    "ActionRow",
    "Button",
    "Link"
  ],
  "features": {
    "accentColors": true,
    "thumbnails": true,
    "spoilers": true
  }
}`;

function V2ComponentsDemo() {
	return (
		<>
			<Attachment
				name="demo-config.json"
				data={Buffer.from(DEMO_CONFIG, "utf-8")}
			/>

			<Container accentColor={0x5865f2}>
				<TextDisplay># Discord Components V2 Demo</TextDisplay>
				<TextDisplay>
					This message demonstrates **all** Discord Components V2 features using
					Reacord. Components V2 allow for rich, structured layouts without
					traditional embeds.
				</TextDisplay>
				<Separator divider spacing="small" />
				<TextDisplay>
					**Available Components:** - Container - Groups components with accent
					colors - TextDisplay - Markdown-formatted text - Section - Text with
					thumbnail or button accessory - Separator - Visual dividers with
					spacing - MediaGallery - Image carousels - File - Attached file
					display - ActionRow - Interactive buttons and selects
				</TextDisplay>
			</Container>

			<Separator spacing="large" />

			<Container accentColor={0x57f287}>
				<Section
					accessory={{
						type: "thumbnail",
						url: "https://cdn.discordapp.com/embed/avatars/0.png",
						description: "Bot Avatar",
					}}
				>
					<TextDisplay>## Section with Thumbnail</TextDisplay>
					<TextDisplay>
						Sections can have a **thumbnail accessory** displayed to the right.
						This is useful for user profiles, product cards, or any content that
						benefits from an accompanying image.
					</TextDisplay>
				</Section>
			</Container>

			<Container accentColor={0xfee75c}>
				<Section
					accessory={{
						type: "link",
						url: "https://discord.com/developers/docs/components/overview",
						label: "View Docs",
					}}
				>
					<TextDisplay>## Section with Link Button</TextDisplay>
					<TextDisplay>
						Sections can also have a **link button accessory**. Click the button
						to open external documentation.
					</TextDisplay>
				</Section>
			</Container>

			<MediaGallery>
				<MediaGalleryItem
					url="https://picsum.photos/seed/ao-demo-1/400/300"
					description="Sample image 1"
				/>
				<MediaGalleryItem
					url="https://picsum.photos/seed/ao-demo-2/400/300"
					description="Sample image 2"
				/>
				<MediaGalleryItem
					url="https://picsum.photos/seed/ao-demo-3/400/300"
					description="Sample image 3"
				/>
				<MediaGalleryItem
					url="https://picsum.photos/seed/ao-demo-4/400/300"
					description="Sample image 4"
				/>
			</MediaGallery>

			<Container accentColor={0xeb459e}>
				<TextDisplay>## Media Gallery</TextDisplay>
				<TextDisplay>
					The images above are displayed using a **MediaGallery** component.
					Discord arranges them in a grid layout automatically.
				</TextDisplay>
			</Container>

			<Separator spacing="small" divider />

			<Container accentColor={0xed4245}>
				<TextDisplay>## File Attachment</TextDisplay>
				<TextDisplay>
					Below is an attached JSON config file displayed using the **File**
					component. Files must be attached first using the **Attachment**
					component.
				</TextDisplay>
			</Container>

			<File url="attachment://demo-config.json" />

			<ActionRow>
				<Button label="Primary" style="primary" onClick={() => {}} disabled />
				<Button
					label="Secondary"
					style="secondary"
					onClick={() => {}}
					disabled
				/>
				<Button label="Success" style="success" onClick={() => {}} disabled />
				<Button label="Danger" style="danger" onClick={() => {}} disabled />
				<Link url="https://answeroverflow.com" label="AnswerOverflow" />
			</ActionRow>

			<Container accentColor={0x5865f2}>
				<TextDisplay>## Interactive Components</TextDisplay>
				<TextDisplay>
					The buttons above show different **button styles** available. They are
					disabled in this demo, but can be made interactive. The last button is
					a **Link** that opens AnswerOverflow.
				</TextDisplay>
				<Separator spacing="small" />
				<TextDisplay>
					*This demo was sent as a non-ephemeral message to the channel.*
				</TextDisplay>
			</Container>
		</>
	);
}

export const handleV2ComponentsDemoCommand = Effect.fn(
	"v2_components_demo_command",
)(function* (interaction: ChatInputCommandInteraction) {
	yield* Effect.annotateCurrentSpan({
		"discord.guild_id": interaction.guildId ?? "unknown",
		"discord.channel_id": interaction.channelId ?? "unknown",
		"discord.user_id": interaction.user.id,
	});
	yield* Metric.increment(commandExecuted("v2_components_demo"));

	const discord = yield* Discord;
	const reacord = yield* Reacord;

	if (interaction.user.id !== SUPER_USER_ID) {
		yield* discord.callClient(() =>
			interaction.reply({
				content: "This command is only available to Rhys.",
				flags: MessageFlags.Ephemeral,
			}),
		);
		return;
	}

	yield* discord.callClient(() =>
		interaction.deferReply({ flags: MessageFlags.Ephemeral }),
	);

	const channel = interaction.channel;
	if (!channel || !("send" in channel)) {
		yield* discord.callClient(() =>
			interaction.editReply({
				content: "Cannot send messages to this channel.",
			}),
		);
		return;
	}

	yield* reacord.send(channel as TextChannel, <V2ComponentsDemo />);

	yield* discord.callClient(() =>
		interaction.editReply({
			content: "V2 Components Demo sent to channel!",
		}),
	);
});

export const V2ComponentsDemoCommandHandlerLayer = Layer.scopedDiscard(
	Effect.gen(function* () {
		const discord = yield* Discord;

		yield* discord.client.on("interactionCreate", (interaction) =>
			Effect.gen(function* () {
				if (
					!interaction.isChatInputCommand() ||
					interaction.commandName !== "v2-components-demo"
				) {
					return;
				}
				yield* handleV2ComponentsDemoCommand(interaction).pipe(
					catchAllWithReport((error) =>
						Effect.gen(function* () {
							const discord = yield* Discord;
							console.error("V2 Components Demo error:", error);

							yield* discord.callClient(() =>
								interaction.editReply({
									content: `Error: ${error instanceof Error ? error.message : String(error)}`,
								}),
							);
						}),
					),
				);
			}),
		);
	}),
);
