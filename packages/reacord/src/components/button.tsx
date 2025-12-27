import { randomUUID } from "node:crypto";
import type { ButtonInteraction } from "discord.js";
import type { Effect } from "effect";
import { ReacordElement } from "../internal/element";
import type { ComponentInteraction } from "../internal/interaction";
import type { MessageOptions } from "../internal/message";
import { getNextActionRow } from "../internal/message";
import { Node, type RunEffect } from "../internal/node";

export interface ButtonProps {
	style?: "primary" | "secondary" | "success" | "danger";
	label?: string;
	emoji?: string;
	disabled?: boolean;
	onClick: (
		interaction: ButtonInteraction,
	) => Effect.Effect<void, unknown, unknown>;
}

export function Button(props: ButtonProps) {
	return (
		<ReacordElement props={props} createNode={() => new ButtonNode(props)}>
			<ReacordElement props={{}} createNode={() => new ButtonLabelNode({})}>
				{props.label}
			</ReacordElement>
		</ReacordElement>
	);
}

class ButtonNode extends Node<ButtonProps> {
	private customId = randomUUID();

	override get text() {
		return "";
	}

	override modifyMessageOptions(options: MessageOptions): void {
		getNextActionRow(options).push({
			type: "button",
			customId: this.customId,
			style: this.props.style ?? "secondary",
			disabled: this.props.disabled,
			emoji: this.props.emoji,
			label: this.children.findType(ButtonLabelNode)?.text,
		});
	}

	override handleComponentInteraction(
		interaction: ComponentInteraction,
		runEffect: RunEffect,
	) {
		if (
			interaction.type === "button" &&
			interaction.customId === this.customId
		) {
			runEffect(this.props.onClick(interaction.interaction));
			return true;
		}
		return false;
	}
}

class ButtonLabelNode extends Node<Record<string, never>> {}
