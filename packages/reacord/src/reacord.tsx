import type {
	ButtonInteraction,
	Client,
	CommandInteraction,
	StringSelectMenuInteraction,
} from "discord.js";
import { Context, Effect, Layer } from "effect";
import type { ReactNode } from "react";
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
	}
>() {}

export function makeReacord(
	client: Client,
	config: ReacordConfig = {},
	runEffect: <A, E, R>(effect: Effect.Effect<A, E, R>) => Promise<A>,
) {
	const renderers: Renderer[] = [];
	const maxInstances = config.maxInstances ?? 50;

	client.on("interactionCreate", (interaction) => {
		if (interaction.isButton() || interaction.isStringSelectMenu()) {
			handleComponentInteraction(
				interaction as ButtonInteraction | StringSelectMenuInteraction,
			);
		}
	});

	function handleComponentInteraction(
		interaction: ButtonInteraction | StringSelectMenuInteraction,
	) {
		for (const renderer of renderers) {
			if (renderer.handleComponentInteraction(interaction)) {
				return;
			}
		}
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
				console.log("[Reacord] render called with content:", content);
				reconciler.updateContainer(
					<InstanceProvider value={instance}>{content}</InstanceProvider>,
					container,
				);
				console.log("[Reacord] updateContainer finished");
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
	};
}

export function ReacordLive(
	client: Client,
	config: ReacordConfig = {},
	runEffect: <A, E, R>(effect: Effect.Effect<A, E, R>) => Promise<A>,
) {
	return Layer.succeed(Reacord, makeReacord(client, config, runEffect));
}
