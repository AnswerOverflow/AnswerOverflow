import { randomUUID } from "node:crypto";
import type { UserSelectMenuInteraction } from "discord.js";
import { ReacordElement } from "../internal/element";
import type { ComponentInteraction } from "../internal/interaction";
import type { MessageOptions } from "../internal/message";
import { Node } from "../internal/node";

export interface UserSelectProps {
	placeholder?: string;
	disabled?: boolean;
	minValues?: number;
	maxValues?: number;
	defaultUserIds?: string[];
	onSelect?: (
		userId: string,
		interaction: UserSelectMenuInteraction,
	) => void | Promise<void>;
	onSelectMultiple?: (
		userIds: string[],
		interaction: UserSelectMenuInteraction,
	) => void | Promise<void>;
}

export function UserSelect(props: UserSelectProps) {
	return (
		<ReacordElement props={props} createNode={(p) => new UserSelectNode(p)} />
	);
}

class UserSelectNode extends Node<UserSelectProps> {
	private customId = randomUUID();

	override get text() {
		return "";
	}

	protected override modifyMessageOptionsInternal(
		options: MessageOptions,
	): void {
		options.actionRows.push([
			{
				type: "userSelect",
				customId: this.customId,
				placeholder: this.props.placeholder,
				disabled: this.props.disabled,
				minValues: this.props.minValues,
				maxValues: this.props.maxValues,
				defaultUserIds: this.props.defaultUserIds,
			},
		]);
	}

	override handleComponentInteraction(interaction: ComponentInteraction) {
		if (
			interaction.type === "userSelect" &&
			interaction.customId === this.customId
		) {
			const selectedUserId = interaction.userIds[0];
			if (this.props.onSelectMultiple) {
				Promise.resolve(
					this.props.onSelectMultiple(
						interaction.userIds,
						interaction.interaction,
					),
				);
			} else if (this.props.onSelect && selectedUserId) {
				Promise.resolve(
					this.props.onSelect(selectedUserId, interaction.interaction),
				);
			}
			return true;
		}
		return false;
	}
}
