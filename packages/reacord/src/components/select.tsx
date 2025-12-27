import { randomUUID } from "node:crypto";
import type { StringSelectMenuInteraction } from "discord.js";
import type { Effect } from "effect";
import { ReacordElement } from "../internal/element";
import type { ComponentInteraction } from "../internal/interaction";
import type { MessageOptions, MessageSelectOptions } from "../internal/message";
import { Node, type RunEffect } from "../internal/node";
import { OptionNode } from "./option";

export interface SelectProps {
	placeholder?: string;
	disabled?: boolean;
	minValues?: number;
	maxValues?: number;
	value?: string;
	values?: string[];
	onSelect?: (
		value: string,
		interaction: StringSelectMenuInteraction,
	) => Effect.Effect<void, unknown, unknown>;
	onSelectMultiple?: (
		values: string[],
		interaction: StringSelectMenuInteraction,
	) => Effect.Effect<void, unknown, unknown>;
	children?: React.ReactNode;
}

export function Select(props: SelectProps) {
	return (
		<ReacordElement props={props} createNode={() => new SelectNode(props)}>
			{props.children}
		</ReacordElement>
	);
}

class SelectNode extends Node<SelectProps> {
	private customId = randomUUID();

	override get text() {
		return "";
	}

	override modifyMessageOptions(options: MessageOptions): void {
		const optionNodes = [...this.children].filter(
			(child): child is OptionNode => child instanceof OptionNode,
		);

		const values =
			this.props.values ?? (this.props.value ? [this.props.value] : undefined);

		const selectOptions: MessageSelectOptions = {
			type: "select",
			customId: this.customId,
			placeholder: this.props.placeholder,
			disabled: this.props.disabled,
			minValues: this.props.minValues,
			maxValues: this.props.maxValues,
			options: optionNodes.map((node) => node.getOptionData()),
			values,
		};

		options.actionRows.push([selectOptions]);
	}

	override handleComponentInteraction(
		interaction: ComponentInteraction,
		runEffect: RunEffect,
	) {
		if (
			interaction.type === "select" &&
			interaction.customId === this.customId
		) {
			if (this.props.onSelectMultiple) {
				runEffect(
					this.props.onSelectMultiple(
						interaction.values,
						interaction.interaction,
					),
				);
			} else if (this.props.onSelect && interaction.values[0]) {
				runEffect(
					this.props.onSelect(interaction.values[0], interaction.interaction),
				);
			}
			return true;
		}
		return false;
	}
}
