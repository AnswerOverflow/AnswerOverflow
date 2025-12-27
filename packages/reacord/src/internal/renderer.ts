import {
	type ButtonInteraction,
	ButtonStyle,
	type CommandInteraction,
	ComponentType,
	type Message,
	type ModalSubmitInteraction,
	type StringSelectMenuInteraction,
} from "discord.js";
import { Effect } from "effect";
import { Container } from "./container";
import { DiscordApiError } from "./errors";
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
			) => Effect.Effect<Message, DiscordApiError>;
			runEffect: <A, E, R>(effect: Effect.Effect<A, E, R>) => Promise<A>;
	  };

export class Renderer {
	readonly nodes = new Container<Node<unknown>>();
	private componentInteraction?: ComponentInteraction;
	private message?: Message;
	private active = true;
	private updateQueue: Array<() => Effect.Effect<void, DiscordApiError>> = [];
	private processing = false;

	constructor(private readonly options: RendererOptions) {}

	render() {
		if (!this.active) {
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

	handleModalInteraction(interaction: ModalSubmitInteraction): boolean {
		const fields = new Map<string, string>();
		for (const [key, field] of interaction.fields.fields) {
			if ("value" in field && typeof field.value === "string") {
				fields.set(key, field.value);
			}
		}

		const reacordInteraction: ComponentInteraction = {
			type: "modal",
			customId: interaction.customId,
			fields,
			interaction,
		};

		for (const node of this.nodes) {
			if (node.handleComponentInteraction(reacordInteraction, this.runEffect)) {
				this.componentInteraction = reacordInteraction;
				setTimeout(() => {
					this.enqueue(() => this.doDeferModalUpdate(interaction));
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

	private enqueue(task: () => Effect.Effect<void, DiscordApiError>) {
		this.updateQueue.push(task);
		this.processQueue();
	}

	private get runEffect() {
		return this.options.runEffect;
	}

	private processQueue() {
		if (this.processing) return;
		this.processing = true;

		const processNext = () => {
			const task = this.updateQueue.shift();
			if (!task) {
				this.processing = false;
				return;
			}

			this.runEffect(
				task().pipe(
					Effect.catchAll((error) =>
						Effect.sync(() => {
							console.error("Reacord update error:", error);
						}),
					),
				),
			).then(processNext);
		};

		processNext();
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

	private doUpdate(): Effect.Effect<void, DiscordApiError> {
		return Effect.gen(this, function* () {
			const options = this.getMessageOptions();
			const discordOptions = this.toDiscordOptions(options);

			if (this.componentInteraction) {
				const componentInteraction = this.componentInteraction;
				this.componentInteraction = undefined;
				if (componentInteraction.type === "modal") {
					return;
				}
				yield* Effect.tryPromise({
					try: () => componentInteraction.interaction.update(discordOptions),
					catch: (cause) => new DiscordApiError({ operation: "update", cause }),
				});
				return;
			}

			if (this.options.type === "interaction") {
				const interaction = this.options.interaction;
				if (interaction.deferred || interaction.replied) {
					const message = yield* Effect.tryPromise({
						try: () => interaction.editReply(discordOptions),
						catch: (cause) =>
							new DiscordApiError({ operation: "editReply", cause }),
					});
					if (!this.message && message) {
						this.message = message;
					}
					return;
				}
				this.message = yield* Effect.tryPromise({
					try: () => interaction.reply({ ...discordOptions, fetchReply: true }),
					catch: (cause) => new DiscordApiError({ operation: "reply", cause }),
				});
				return;
			}

			const message = this.message;
			if (message) {
				yield* Effect.tryPromise({
					try: () => message.edit(discordOptions),
					catch: (cause) => new DiscordApiError({ operation: "edit", cause }),
				});
				return;
			}

			this.message = yield* this.options.createMessage(discordOptions);
		});
	}

	private doDeactivate(): Effect.Effect<void, DiscordApiError> {
		const rendererOptions = this.options;
		const message = this.message;
		return Effect.gen(this, function* () {
			const options = this.getMessageOptions();
			const discordOptions = this.toDiscordOptions(options);

			discordOptions.components = discordOptions.components?.map((row) => ({
				...row,
				components: row.components.map((c) => ({ ...c, disabled: true })),
			}));

			if (rendererOptions.type === "interaction") {
				yield* Effect.tryPromise({
					try: () => rendererOptions.interaction.editReply(discordOptions),
					catch: (cause) =>
						new DiscordApiError({ operation: "editReply", cause }),
				});
				return;
			}

			if (message) {
				yield* Effect.tryPromise({
					try: () => message.edit(discordOptions),
					catch: (cause) => new DiscordApiError({ operation: "edit", cause }),
				});
			}
		});
	}

	private doDestroy(): Effect.Effect<void, DiscordApiError> {
		const rendererOptions = this.options;
		const message = this.message;
		return Effect.gen(function* () {
			if (rendererOptions.type === "interaction") {
				yield* Effect.tryPromise({
					try: () => rendererOptions.interaction.deleteReply(),
					catch: (cause) =>
						new DiscordApiError({ operation: "deleteReply", cause }),
				});
				return;
			}

			if (message) {
				yield* Effect.tryPromise({
					try: () => message.delete(),
					catch: (cause) => new DiscordApiError({ operation: "delete", cause }),
				});
			}
		});
	}

	private doDeferUpdate(
		interaction: ButtonInteraction | StringSelectMenuInteraction,
	): Effect.Effect<void, DiscordApiError> {
		return Effect.gen(function* () {
			if (!interaction.deferred && !interaction.replied) {
				yield* Effect.tryPromise({
					try: () => interaction.deferUpdate(),
					catch: (cause) =>
						new DiscordApiError({ operation: "deferUpdate", cause }),
				});
			}
		});
	}

	private doDeferModalUpdate(
		interaction: ModalSubmitInteraction,
	): Effect.Effect<void, DiscordApiError> {
		const rendererOptions = this.options;
		return Effect.gen(this, function* () {
			if (!interaction.deferred && !interaction.replied) {
				yield* Effect.tryPromise({
					try: () => interaction.deferUpdate(),
					catch: (cause) =>
						new DiscordApiError({ operation: "deferUpdate", cause }),
				});

				const options = this.getMessageOptions();
				const discordOptions = this.toDiscordOptions(options);

				if (rendererOptions.type === "interaction") {
					yield* Effect.tryPromise({
						try: () => rendererOptions.interaction.editReply(discordOptions),
						catch: (cause) =>
							new DiscordApiError({ operation: "editReply", cause }),
					});
				}
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
