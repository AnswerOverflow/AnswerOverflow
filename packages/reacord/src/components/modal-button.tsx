import { randomUUID } from "node:crypto";
import type { ButtonInteraction, ModalSubmitInteraction } from "discord.js";
import {
	ActionRowBuilder,
	ModalBuilder,
	TextInputBuilder,
	TextInputStyle,
} from "discord.js";
import { Effect } from "effect";
import { ReacordElement } from "../internal/element";
import type { ComponentInteraction } from "../internal/interaction";
import type { MessageOptions } from "../internal/message";
import { getNextActionRow } from "../internal/message";
import { Node, type RunEffect } from "../internal/node";

export interface TextInputField<Id extends string = string> {
	id: Id;
	label: string;
	style?: "short" | "paragraph";
	placeholder?: string;
	defaultValue?: string;
	required?: boolean;
	minLength?: number;
	maxLength?: number;
}

type ExtractFieldIds<T extends readonly TextInputField[]> = T[number]["id"];

type TypedFieldMap<T extends readonly TextInputField[]> = {
	get<K extends ExtractFieldIds<T>>(key: K): string | undefined;
	get(key: string): string | undefined;
} & Map<ExtractFieldIds<T>, string>;

export interface ModalButtonProps<
	T extends readonly TextInputField[] = readonly TextInputField[],
> {
	style?: "primary" | "secondary" | "success" | "danger";
	label?: string;
	emoji?: string;
	disabled?: boolean;
	modalTitle: string;
	fields: T;
	onSubmit: (
		fields: TypedFieldMap<T>,
		interaction: ModalSubmitInteraction,
	) => Effect.Effect<void, unknown, unknown>;
}

export function ModalButton<const T extends readonly TextInputField[]>(
	props: ModalButtonProps<T>,
) {
	return (
		<ReacordElement props={props} createNode={(p) => new ModalButtonNode(p)}>
			<ReacordElement
				props={{}}
				createNode={() => new ModalButtonLabelNode({})}
			>
				{props.label}
			</ReacordElement>
		</ReacordElement>
	);
}

class ModalButtonNode<T extends readonly TextInputField[]> extends Node<
	ModalButtonProps<T>
> {
	private buttonCustomId = randomUUID();
	private modalCustomId = randomUUID();

	override get text() {
		return "";
	}

	override modifyMessageOptions(options: MessageOptions): void {
		getNextActionRow(options).push({
			type: "button",
			customId: this.buttonCustomId,
			style: this.props.style ?? "secondary",
			disabled: this.props.disabled,
			emoji: this.props.emoji,
			label: this.children.findType(ModalButtonLabelNode)?.text,
		});
	}

	override handleComponentInteraction(
		interaction: ComponentInteraction,
		runEffect: RunEffect,
	) {
		if (
			interaction.type === "button" &&
			interaction.customId === this.buttonCustomId
		) {
			runEffect(this.showModal(interaction.interaction));
			return true;
		}

		if (
			interaction.type === "modal" &&
			interaction.customId === this.modalCustomId
		) {
			runEffect(
				this.props.onSubmit(
					interaction.fields as TypedFieldMap<T>,
					interaction.interaction,
				),
			);
			return true;
		}

		return false;
	}

	private showModal(
		interaction: ButtonInteraction,
	): Effect.Effect<void, unknown> {
		return Effect.tryPromise(() => {
			const modal = new ModalBuilder()
				.setCustomId(this.modalCustomId)
				.setTitle(this.props.modalTitle);

			for (const field of this.props.fields) {
				const textInput = new TextInputBuilder()
					.setCustomId(field.id)
					.setLabel(field.label)
					.setStyle(
						field.style === "paragraph"
							? TextInputStyle.Paragraph
							: TextInputStyle.Short,
					)
					.setRequired(field.required ?? true);

				if (field.placeholder) {
					textInput.setPlaceholder(field.placeholder);
				}
				if (field.defaultValue) {
					textInput.setValue(field.defaultValue);
				}
				if (field.minLength !== undefined) {
					textInput.setMinLength(field.minLength);
				}
				if (field.maxLength !== undefined) {
					textInput.setMaxLength(field.maxLength);
				}

				modal.addComponents(
					new ActionRowBuilder<TextInputBuilder>().addComponents(textInput),
				);
			}

			return interaction.showModal(modal);
		});
	}
}

class ModalButtonLabelNode extends Node<Record<string, never>> {}
