import { randomUUID } from "node:crypto";
import type { ButtonInteraction } from "discord.js";
import { ReacordElement } from "../internal/element";
import type { ComponentInteraction } from "../internal/interaction";
import type { MessageOptions } from "../internal/message";
import { getOrCreateActionRow } from "../internal/message";
import { Node } from "../internal/node";

export interface ButtonProps {
	style?: "primary" | "secondary" | "success" | "danger";
	label?: string;
	emoji?: string;
	disabled?: boolean;
	onClick: (interaction: ButtonInteraction) => void | Promise<void>;
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

	protected override modifyMessageOptionsInternal(
		options: MessageOptions,
	): void {
		getOrCreateActionRow(options).components.push({
			type: "button",
			customId: this.customId,
			style: this.props.style ?? "secondary",
			disabled: this.props.disabled,
			emoji: this.props.emoji,
			label: this.children.findType(ButtonLabelNode)?.text,
		});
	}

	override handleComponentInteraction(interaction: ComponentInteraction) {
		if (
			interaction.type === "button" &&
			interaction.customId === this.customId
		) {
			Promise.resolve(this.props.onClick(interaction.interaction));
			return true;
		}
		return false;
	}
}

class ButtonLabelNode extends Node<Record<string, never>> {}
