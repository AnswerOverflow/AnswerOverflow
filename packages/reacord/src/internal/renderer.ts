import {
	type ButtonInteraction,
	ButtonStyle,
	type CommandInteraction,
	ComponentType,
	type Message,
	type StringSelectMenuInteraction,
} from "discord.js";
import { Effect } from "effect";
import { Container } from "./container";
import type { ComponentInteraction } from "./interaction";
import type { MessageButtonOptions, MessageOptions } from "./message";
import type { Node } from "./node";

type DiscordMessageOptions = {
	content?: string;
	embeds?: MessageOptions["embeds"];
	components?: Array<{
		type: ComponentType.ActionRow;
		components: Array<{
			type: ComponentType.Button | ComponentType.StringSelect;
			customId?: string;
			url?: string;
			label?: string;
			style?: ButtonStyle;
			disabled?: boolean;
			emoji?: string;
			placeholder?: string;
			minValues?: number;
			maxValues?: number;
			options?: Array<{
				label: string;
				value: string;
				description?: string;
				emoji?: string;
				default?: boolean;
			}>;
		}>;
	}>;
};

type RendererOptions =
	| {
			type: "interaction";
			interaction: CommandInteraction;
			runEffect: <A, E, R>(effect: Effect.Effect<A, E, R>) => Promise<A>;
	  }
	| {
			type: "message";
			createMessage: (
				options: DiscordMessageOptions,
			) => Effect.Effect<Message, unknown>;
			runEffect: <A, E, R>(effect: Effect.Effect<A, E, R>) => Promise<A>;
	  };

export class Renderer {
	readonly nodes = new Container<Node<unknown>>();
	private componentInteraction?: ComponentInteraction;
	private message?: Message;
	private active = true;
	private updateQueue: Array<() => Effect.Effect<void, unknown>> = [];
	private processing = false;

	constructor(private readonly options: RendererOptions) {}

	render() {
		if (!this.active) {
			console.warn("Attempted to update a deactivated message");
			return;
		}

		this.enqueue(() => this.doUpdate());
	}

	deactivate() {
		this.active = false;
		this.enqueue(() => this.doDeactivate());
	}

	destroy() {
		this.active = false;
		this.enqueue(() => this.doDestroy());
	}

	handleComponentInteraction(
		interaction: ButtonInteraction | StringSelectMenuInteraction,
	): boolean {
		const reacordInteraction = this.toReacordInteraction(interaction);

		for (const node of this.nodes) {
			if (node.handleComponentInteraction(reacordInteraction, this.runEffect)) {
				this.componentInteraction = reacordInteraction;
				setTimeout(() => {
					this.enqueue(() => this.doDeferUpdate(interaction));
				}, 500);
				return true;
			}
		}
		return false;
	}

	private toReacordInteraction(
		interaction: ButtonInteraction | StringSelectMenuInteraction,
	): ComponentInteraction {
		if (interaction.isButton()) {
			return {
				type: "button",
				customId: interaction.customId,
				interaction,
			};
		}
		return {
			type: "select",
			customId: interaction.customId,
			values: interaction.values,
			interaction,
		};
	}

	private enqueue(task: () => Effect.Effect<void, unknown>) {
		this.updateQueue.push(task);
		this.processQueue();
	}

	private get runEffect() {
		return this.options.runEffect;
	}

	private async processQueue() {
		if (this.processing) return;
		this.processing = true;

		while (this.updateQueue.length > 0) {
			const task = this.updateQueue.shift();
			if (task) {
				try {
					await this.runEffect(task());
				} catch (error) {
					console.error("Reacord update error:", error);
				}
			}
		}

		this.processing = false;
	}

	private getMessageOptions(): MessageOptions {
		const options: MessageOptions = {
			content: "",
			embeds: [],
			actionRows: [],
		};
		for (const node of this.nodes) {
			node.modifyMessageOptions(options);
		}
		return options;
	}

	private toDiscordOptions(options: MessageOptions): DiscordMessageOptions {
		return {
			content: options.content || undefined,
			embeds: options.embeds,
			components: options.actionRows.map((row) => ({
				type: ComponentType.ActionRow,
				components: row.map((component) => {
					if (component.type === "button") {
						return {
							type: ComponentType.Button,
							customId: component.customId,
							label: component.label ?? "",
							style: this.convertButtonStyle(component.style),
							disabled: component.disabled,
							emoji: component.emoji,
						};
					}

					if (component.type === "link") {
						return {
							type: ComponentType.Button,
							url: component.url,
							label: component.label ?? "",
							style: ButtonStyle.Link,
							disabled: component.disabled,
							emoji: component.emoji,
						};
					}

					return {
						type: ComponentType.StringSelect,
						customId: component.customId,
						placeholder: component.placeholder,
						disabled: component.disabled,
						minValues: component.minValues,
						maxValues: component.maxValues,
						options: component.options.map((opt) => ({
							...opt,
							default: component.values?.includes(opt.value),
						})),
					};
				}),
			})),
		};
	}

	private convertButtonStyle(
		style: MessageButtonOptions["style"],
	): ButtonStyle {
		const styleMap = {
			primary: ButtonStyle.Primary,
			secondary: ButtonStyle.Secondary,
			success: ButtonStyle.Success,
			danger: ButtonStyle.Danger,
		} as const;
		return styleMap[style ?? "secondary"];
	}

	private doUpdate(): Effect.Effect<void, unknown> {
		return Effect.gen(this, function* () {
			const options = this.getMessageOptions();
			const discordOptions = this.toDiscordOptions(options);

			if (this.componentInteraction) {
				const interaction = this.componentInteraction.interaction;
				this.componentInteraction = undefined;
				yield* Effect.tryPromise(() => interaction.update(discordOptions));
				return;
			}

			if (this.options.type === "interaction") {
				const interaction = this.options.interaction;
				if (interaction.deferred || interaction.replied) {
					const message = yield* Effect.tryPromise(() =>
						interaction.editReply(discordOptions),
					);
					if (!this.message && message) {
						this.message = message;
					}
					return;
				}
				this.message = yield* Effect.tryPromise(() =>
					interaction.reply({ ...discordOptions, fetchReply: true }),
				);
				return;
			}

			if (this.message) {
				yield* Effect.tryPromise(() => this.message!.edit(discordOptions));
				return;
			}

			this.message = yield* this.options.createMessage(discordOptions);
		});
	}

	private doDeactivate(): Effect.Effect<void, unknown> {
		const rendererOptions = this.options;
		return Effect.gen(this, function* () {
			const options = this.getMessageOptions();
			const discordOptions = this.toDiscordOptions(options);

			discordOptions.components = discordOptions.components?.map((row) => ({
				...row,
				components: row.components.map((c) => ({ ...c, disabled: true })),
			}));

			if (rendererOptions.type === "interaction") {
				yield* Effect.tryPromise(() =>
					rendererOptions.interaction.editReply(discordOptions),
				);
				return;
			}

			if (this.message) {
				yield* Effect.tryPromise(() => this.message!.edit(discordOptions));
			}
		});
	}

	private doDestroy(): Effect.Effect<void, unknown> {
		const rendererOptions = this.options;
		return Effect.gen(this, function* () {
			if (rendererOptions.type === "interaction") {
				yield* Effect.tryPromise(() =>
					rendererOptions.interaction.deleteReply(),
				);
				return;
			}

			if (this.message) {
				yield* Effect.tryPromise(() => this.message!.delete());
			}
		});
	}

	private doDeferUpdate(
		interaction: ButtonInteraction | StringSelectMenuInteraction,
	): Effect.Effect<void, unknown> {
		return Effect.gen(function* () {
			if (!interaction.deferred && !interaction.replied) {
				yield* Effect.tryPromise(() => interaction.deferUpdate());
			}
		});
	}
}

export function createInteractionReplyRenderer(
	interaction: CommandInteraction,
	runEffect: <A, E, R>(effect: Effect.Effect<A, E, R>) => Promise<A>,
) {
	return new Renderer({
		type: "interaction",
		interaction,
		runEffect,
	});
}
