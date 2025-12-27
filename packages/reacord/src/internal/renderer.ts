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
import type {
	MessageButtonOptions,
	MessageOptions,
	MessageSelectOptions,
} from "./message";
import type { Node } from "./node";

let rendererId = 0;

const DEFER_UPDATE_DELAY_MS = 500;

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
	private readonly id = ++rendererId;

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
			this.componentInteraction = reacordInteraction;

			try {
				if (node.handleComponentInteraction(reacordInteraction)) {
					setTimeout(() => {
						this.enqueue(() => this.doDeferUpdate(interaction));
					}, DEFER_UPDATE_DELAY_MS);
					return true;
				}
			} finally {
				this.componentInteraction = undefined;
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
			this.componentInteraction = reacordInteraction;

			try {
				if (node.handleComponentInteraction(reacordInteraction)) {
					setTimeout(() => {
						this.enqueue(() => this.doDeferModalUpdate(interaction));
					}, DEFER_UPDATE_DELAY_MS);
					return true;
				}
			} finally {
				this.componentInteraction = undefined;
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
			)
				.then(processNext)
				.catch((error) => {
					console.error("Reacord queue processing error:", error);
					processNext();
				});
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
		const hasComponentInteraction = !!this.componentInteraction;
		const componentInteractionType = this.componentInteraction?.type;
		const componentInteractionCustomId = this.componentInteraction?.customId;

		return Effect.gen(this, function* () {
			yield* Effect.annotateCurrentSpan({
				"reacord.renderer_id": this.id,
				"reacord.has_component_interaction": hasComponentInteraction,
				"reacord.component_interaction_type":
					componentInteractionType ?? "none",
				"reacord.component_interaction_custom_id":
					componentInteractionCustomId ?? "none",
				"reacord.options_type": this.options.type,
				"reacord.has_message": !!this.message,
				"reacord.active": this.active,
			});

			const options = this.getMessageOptions();
			const discordOptions = this.toDiscordOptions(options);

			const rawSelectOptions = options.actionRows
				.flat()
				.filter(
					(c): c is MessageSelectOptions => "type" in c && c.type === "select",
				);
			const rawSelectValues = rawSelectOptions.map((s) => ({
				customId: s.customId,
				rawValues: s.values,
			}));

			const selectComponents = discordOptions.components?.flatMap((row) =>
				row.components.filter((c) => c.type === ComponentType.StringSelect),
			);
			const selectValues = selectComponents?.map((s) => {
				const defaultOptions = s.options?.filter((o) => o.default);
				return {
					customId: s.customId,
					defaultValues: defaultOptions?.map((o) => o.value),
				};
			});

			const buttonComponents = discordOptions.components?.flatMap((row) =>
				row.components.filter((c) => c.type === ComponentType.Button),
			);
			const buttonStates = buttonComponents?.map((b) => ({
				label: b.label,
				disabled: b.disabled,
			}));

			yield* Effect.annotateCurrentSpan({
				"reacord.embed_count": discordOptions.embeds?.length ?? 0,
				"reacord.component_count": discordOptions.components?.length ?? 0,
				"reacord.select_raw_values": JSON.stringify(rawSelectValues),
				"reacord.select_values": JSON.stringify(selectValues),
				"reacord.button_states": JSON.stringify(buttonStates),
			});

			if (this.componentInteraction) {
				const componentInteraction = this.componentInteraction;
				this.componentInteraction = undefined;
				if (componentInteraction.type === "modal") {
					yield* Effect.annotateCurrentSpan({
						"reacord.update_path": "modal_skip",
					});
					return;
				}
				yield* Effect.annotateCurrentSpan({
					"reacord.update_path": "component_interaction_update",
				});
				yield* Effect.tryPromise({
					try: () => componentInteraction.interaction.update(discordOptions),
					catch: (cause) => new DiscordApiError({ operation: "update", cause }),
				}).pipe(Effect.withSpan("reacord.discord_update"));
				return;
			}

			if (this.options.type === "interaction") {
				const interaction = this.options.interaction;
				yield* Effect.annotateCurrentSpan({
					"reacord.interaction_deferred": interaction.deferred,
					"reacord.interaction_replied": interaction.replied,
				});
				if (interaction.deferred || interaction.replied) {
					yield* Effect.annotateCurrentSpan({
						"reacord.update_path": "edit_reply",
					});
					const message = yield* Effect.tryPromise({
						try: () => interaction.editReply(discordOptions),
						catch: (cause) =>
							new DiscordApiError({ operation: "editReply", cause }),
					}).pipe(Effect.withSpan("reacord.discord_edit_reply"));
					if (!this.message && message) {
						this.message = message;
					}
					return;
				}
				yield* Effect.annotateCurrentSpan({
					"reacord.update_path": "initial_reply",
				});
				this.message = yield* Effect.tryPromise({
					try: () => interaction.reply({ ...discordOptions, fetchReply: true }),
					catch: (cause) => new DiscordApiError({ operation: "reply", cause }),
				}).pipe(Effect.withSpan("reacord.discord_reply"));
				return;
			}

			const message = this.message;
			if (message) {
				yield* Effect.annotateCurrentSpan({
					"reacord.update_path": "message_edit",
				});
				yield* Effect.tryPromise({
					try: () => message.edit(discordOptions),
					catch: (cause) => new DiscordApiError({ operation: "edit", cause }),
				}).pipe(Effect.withSpan("reacord.discord_message_edit"));
				return;
			}

			yield* Effect.annotateCurrentSpan({
				"reacord.update_path": "create_message",
			});
			this.message = yield* this.options
				.createMessage(discordOptions)
				.pipe(Effect.withSpan("reacord.discord_create_message"));
		}).pipe(Effect.withSpan("reacord.do_update"));
	}

	private doDeactivate(): Effect.Effect<void, DiscordApiError> {
		const rendererOptions = this.options;
		const message = this.message;
		return Effect.gen(this, function* () {
			yield* Effect.annotateCurrentSpan({
				"reacord.renderer_id": this.id,
				"reacord.options_type": rendererOptions.type,
			});

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
				}).pipe(Effect.withSpan("reacord.discord_deactivate_edit_reply"));
				return;
			}

			if (message) {
				yield* Effect.tryPromise({
					try: () => message.edit(discordOptions),
					catch: (cause) => new DiscordApiError({ operation: "edit", cause }),
				}).pipe(Effect.withSpan("reacord.discord_deactivate_message_edit"));
			}
		}).pipe(Effect.withSpan("reacord.do_deactivate"));
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
				}).pipe(Effect.withSpan("reacord.discord_delete_reply"));
				return;
			}

			if (message) {
				yield* Effect.tryPromise({
					try: () => message.delete(),
					catch: (cause) => new DiscordApiError({ operation: "delete", cause }),
				}).pipe(Effect.withSpan("reacord.discord_delete_message"));
			}
		}).pipe(Effect.withSpan("reacord.do_destroy"));
	}

	private doDeferUpdate(
		interaction: ButtonInteraction | StringSelectMenuInteraction,
	): Effect.Effect<void, DiscordApiError> {
		return Effect.gen(function* () {
			yield* Effect.annotateCurrentSpan({
				"reacord.interaction_deferred": interaction.deferred,
				"reacord.interaction_replied": interaction.replied,
			});
			if (!interaction.deferred && !interaction.replied) {
				yield* Effect.tryPromise({
					try: () => interaction.deferUpdate(),
					catch: (cause) =>
						new DiscordApiError({ operation: "deferUpdate", cause }),
				}).pipe(Effect.withSpan("reacord.discord_defer_update"));
			}
		}).pipe(Effect.withSpan("reacord.do_defer_update"));
	}

	private doDeferModalUpdate(
		interaction: ModalSubmitInteraction,
	): Effect.Effect<void, DiscordApiError> {
		const rendererOptions = this.options;
		return Effect.gen(this, function* () {
			yield* Effect.annotateCurrentSpan({
				"reacord.interaction_deferred": interaction.deferred,
				"reacord.interaction_replied": interaction.replied,
			});
			if (!interaction.deferred && !interaction.replied) {
				yield* Effect.tryPromise({
					try: () => interaction.deferUpdate(),
					catch: (cause) =>
						new DiscordApiError({ operation: "deferUpdate", cause }),
				}).pipe(Effect.withSpan("reacord.discord_defer_modal_update"));

				const options = this.getMessageOptions();
				const discordOptions = this.toDiscordOptions(options);

				if (rendererOptions.type === "interaction") {
					yield* Effect.tryPromise({
						try: () => rendererOptions.interaction.editReply(discordOptions),
						catch: (cause) =>
							new DiscordApiError({ operation: "editReply", cause }),
					}).pipe(Effect.withSpan("reacord.discord_modal_edit_reply"));
				}
			}
		}).pipe(Effect.withSpan("reacord.do_defer_modal_update"));
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
