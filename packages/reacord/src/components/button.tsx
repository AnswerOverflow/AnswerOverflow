import { randomUUID } from "node:crypto";
import type { ButtonInteraction } from "discord.js";
import { Effect } from "effect";
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
		<ReacordElement props={props} createNode={(p) => new ButtonNode(p)}>
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
			runEffect(
				this.props.onClick(interaction.interaction).pipe(
					Effect.withSpan("reacord.button.on_click", {
						attributes: {
							"reacord.button.custom_id": this.customId,
							"reacord.button.label":
								this.children.findType(ButtonLabelNode)?.text ?? "unknown",
						},
					}),
				),
			);
			return true;
		}
		return false;
	}
}

class ButtonLabelNode extends Node<Record<string, never>> {}
