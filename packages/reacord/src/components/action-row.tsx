import { ReacordElement } from "../internal/element";
import type { MessageOptions } from "../internal/message";
import { Node } from "../internal/node";

export interface ActionRowProps {
	children?: React.ReactNode;
}

export function ActionRow(props: ActionRowProps) {
	return (
		<ReacordElement props={props} createNode={(p) => new ActionRowNode(p)}>
			{props.children}
		</ReacordElement>
	);
}

class ActionRowNode extends Node<ActionRowProps> {
	override get text() {
		return "";
	}

	protected override modifyMessageOptionsInternal(
		options: MessageOptions,
	): void {
		options.actionRows.push([]);
		for (const child of this.children) {
			child.modifyMessageOptions(options);
		}
	}
}
