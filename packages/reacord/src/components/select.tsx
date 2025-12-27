import { randomUUID } from "node:crypto";
import type { StringSelectMenuInteraction } from "discord.js";
import { Effect } from "effect";
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
	defaultValue?: string;
	defaultValues?: string[];
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
		<ReacordElement props={props} createNode={(p) => new SelectNode(p)}>
			{props.children}
		</ReacordElement>
	);
}

class SelectNode extends Node<SelectProps> {
	private customId = randomUUID();
	private selectedValues: string[] | undefined;
	private initialized = false;

	override get text() {
		return "";
	}

	override modifyMessageOptions(options: MessageOptions): void {
		const optionNodes = [...this.children].filter(
			(child): child is OptionNode => child instanceof OptionNode,
		);

		if (!this.initialized) {
			this.selectedValues =
				this.props.defaultValues ??
				(this.props.defaultValue ? [this.props.defaultValue] : undefined);
			this.initialized = true;
		}

		const selectOptions: MessageSelectOptions = {
			type: "select",
			customId: this.customId,
			placeholder: this.props.placeholder,
			disabled: this.props.disabled,
			minValues: this.props.minValues,
			maxValues: this.props.maxValues,
			options: optionNodes.map((node) => node.getOptionData()),
			values: this.selectedValues,
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
			this.selectedValues = interaction.values;

			const selectedValue = interaction.values[0];
			if (this.props.onSelectMultiple) {
				runEffect(
					this.props
						.onSelectMultiple(interaction.values, interaction.interaction)
						.pipe(
							Effect.withSpan("reacord.select.on_select_multiple", {
								attributes: {
									"reacord.select.custom_id": this.customId,
									"reacord.select.values": interaction.values.join(","),
								},
							}),
						),
				);
			} else if (this.props.onSelect && selectedValue) {
				runEffect(
					this.props.onSelect(selectedValue, interaction.interaction).pipe(
						Effect.withSpan("reacord.select.on_select", {
							attributes: {
								"reacord.select.custom_id": this.customId,
								"reacord.select.value": selectedValue,
							},
						}),
					),
				);
			}
			return true;
		}
		return false;
	}
}
