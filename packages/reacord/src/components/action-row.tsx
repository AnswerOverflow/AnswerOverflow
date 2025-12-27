import { ReacordElement } from "../internal/element";
import type { MessageOptions } from "../internal/message";
import { Node } from "../internal/node";

export interface ActionRowProps {
	children?: React.ReactNode;
}

export function ActionRow(props: ActionRowProps) {
	return (
		<ReacordElement props={props} createNode={() => new ActionRowNode(props)}>
			{props.children}
		</ReacordElement>
	);
}

class ActionRowNode extends Node<ActionRowProps> {
	override get text() {
		return "";
	}

	override modifyMessageOptions(options: MessageOptions): void {
		options.actionRows.push([]);
		for (const child of this.children) {
			child.modifyMessageOptions(options);
		}
	}
}
