import { ReacordElement } from "../internal/element";
import type { MessageOptions, SeparatorComponent } from "../internal/message";
import { Node } from "../internal/node";

export interface SeparatorProps {
	divider?: boolean;
	spacing?: "small" | "large";
}

export function Separator(props: SeparatorProps) {
	return (
		<ReacordElement props={props} createNode={(p) => new SeparatorNode(p)} />
	);
}

class SeparatorNode extends Node<SeparatorProps> {
	override get text() {
		return "";
	}

	protected override modifyMessageOptionsInternal(
		options: MessageOptions,
	): void {
		const separator: SeparatorComponent = {
			type: "separator",
			divider: this.props.divider ?? true,
			spacing: this.props.spacing,
		};
		options.components.push(separator);
	}
}
