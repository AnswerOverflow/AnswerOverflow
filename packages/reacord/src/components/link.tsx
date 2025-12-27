import { ReacordElement } from "../internal/element";
import type { MessageOptions } from "../internal/message";
import { getNextActionRow } from "../internal/message";
import { Node } from "../internal/node";

export interface LinkProps {
	url: string;
	label?: string;
	emoji?: string;
	disabled?: boolean;
}

export function Link(props: LinkProps) {
	return (
		<ReacordElement props={props} createNode={() => new LinkNode(props)}>
			<ReacordElement props={{}} createNode={() => new LinkLabelNode({})}>
				{props.label}
			</ReacordElement>
		</ReacordElement>
	);
}

class LinkNode extends Node<LinkProps> {
	override get text() {
		return "";
	}

	override modifyMessageOptions(options: MessageOptions): void {
		getNextActionRow(options).push({
			type: "link",
			url: this.props.url,
			label: this.children.findType(LinkLabelNode)?.text,
			emoji: this.props.emoji,
			disabled: this.props.disabled,
		});
	}
}

class LinkLabelNode extends Node<Record<string, never>> {}
