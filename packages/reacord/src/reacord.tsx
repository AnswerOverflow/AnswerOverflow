import { RegistryProvider } from "@effect-atom/atom-react";
import type {
	ButtonInteraction,
	Client,
	CommandInteraction,
	Interaction,
	ModalSubmitInteraction,
	StringSelectMenuInteraction,
} from "discord.js";
import { Context, Effect, Layer } from "effect";
import type { ReactNode } from "react";
import { EffectRuntimeProvider } from "./effect-context";
import type { ReacordInstance } from "./instance";
import { InstanceProvider } from "./instance-context";
import { reconciler } from "./internal/reconciler";
import {
	createInteractionReplyRenderer,
	type Renderer,
} from "./internal/renderer";

export interface ReacordConfig {
	maxInstances?: number;
}

export class Reacord extends Context.Tag("Reacord")<
	Reacord,
	{
		reply: (
			interaction: CommandInteraction,
			content: ReactNode,
		) => Effect.Effect<ReacordInstance>;
		cleanup: () => void;
	}
>() {}

function isButtonInteraction(
	interaction: Interaction,
): interaction is ButtonInteraction {
	return interaction.isButton();
}

function isStringSelectMenuInteraction(
	interaction: Interaction,
): interaction is StringSelectMenuInteraction {
	return interaction.isStringSelectMenu();
}

function isModalSubmitInteraction(
	interaction: Interaction,
): interaction is ModalSubmitInteraction {
	return interaction.isModalSubmit();
}

export function makeReacord(
	client: Client,
	config: ReacordConfig = {},
	runEffect: <A, E, R>(effect: Effect.Effect<A, E, R>) => Promise<A>,
) {
	const renderers: Renderer[] = [];
	const maxInstances = config.maxInstances ?? 50;

	function onInteractionCreate(interaction: Interaction) {
		if (isButtonInteraction(interaction)) {
			runEffect(
				handleComponentInteraction(interaction).pipe(
					Effect.withSpan("reacord.handle_button_interaction", {
						attributes: {
							"reacord.interaction_type": "button",
							"reacord.custom_id": interaction.customId,
							"reacord.renderer_count": renderers.length,
						},
					}),
				),
			);
		} else if (isStringSelectMenuInteraction(interaction)) {
			runEffect(
				handleComponentInteraction(interaction).pipe(
					Effect.withSpan("reacord.handle_select_interaction", {
						attributes: {
							"reacord.interaction_type": "select",
							"reacord.custom_id": interaction.customId,
							"reacord.selected_values": interaction.values.join(","),
							"reacord.renderer_count": renderers.length,
						},
					}),
				),
			);
		} else if (isModalSubmitInteraction(interaction)) {
			runEffect(
				handleModalInteraction(interaction).pipe(
					Effect.withSpan("reacord.handle_modal_interaction", {
						attributes: {
							"reacord.interaction_type": "modal",
							"reacord.custom_id": interaction.customId,
							"reacord.renderer_count": renderers.length,
						},
					}),
				),
			);
		}
	}

	client.on("interactionCreate", onInteractionCreate);

	function handleComponentInteraction(
		interaction: ButtonInteraction | StringSelectMenuInteraction,
	): Effect.Effect<void> {
		return Effect.sync(() => {
			for (const renderer of renderers) {
				if (renderer.handleComponentInteraction(interaction)) {
					return;
				}
			}
		});
	}

	function handleModalInteraction(
		interaction: ModalSubmitInteraction,
	): Effect.Effect<void> {
		return Effect.sync(() => {
			for (const renderer of renderers) {
				if (renderer.handleModalInteraction(interaction)) {
					return;
				}
			}
		});
	}

	function createInstance(
		renderer: Renderer,
		initialContent?: ReactNode,
	): ReacordInstance {
		if (renderers.length >= maxInstances && renderers[0]) {
			deactivate(renderers[0]);
		}

		renderers.push(renderer);

		const container: unknown = reconciler.createContainer(
			renderer,
			0, // tag: ConcurrentRoot = 0, LegacyRoot = 1
			null, // hydrationCallbacks
			false, // isStrictMode
			null, // concurrentUpdatesByDefaultOverride
			"reacord", // identifierPrefix
			(error: Error) => console.error("[Reacord] recoverable error:", error), // onRecoverableError
			null, // transitionCallbacks
		);

		const instance: ReacordInstance = {
			render: (content: ReactNode) => {
				reconciler.updateContainer(
					<RegistryProvider>
						<EffectRuntimeProvider runEffect={runEffect}>
							<InstanceProvider value={instance}>{content}</InstanceProvider>
						</EffectRuntimeProvider>
					</RegistryProvider>,
					container,
				);
				return instance;
			},
			deactivate: () => {
				deactivate(renderer);
			},
			destroy: () => {
				const index = renderers.indexOf(renderer);
				if (index !== -1) {
					renderers.splice(index, 1);
				}
				renderer.destroy();
			},
		};

		if (initialContent !== undefined) {
			instance.render(initialContent);
		}

		return instance;
	}

	function deactivate(renderer: Renderer) {
		const index = renderers.indexOf(renderer);
		if (index !== -1) {
			renderers.splice(index, 1);
		}
		renderer.deactivate();
	}

	return {
		reply: (interaction: CommandInteraction, content: ReactNode) =>
			Effect.sync(() => {
				const renderer = createInteractionReplyRenderer(interaction, runEffect);
				return createInstance(renderer, content);
			}),
		cleanup: () => {
			client.off("interactionCreate", onInteractionCreate);
			for (const renderer of renderers) {
				renderer.deactivate();
			}
			renderers.length = 0;
		},
	};
}

export function ReacordLive(
	client: Client,
	config: ReacordConfig = {},
	runEffect: <A, E, R>(effect: Effect.Effect<A, E, R>) => Promise<A>,
) {
	return Layer.succeed(Reacord, makeReacord(client, config, runEffect));
}
