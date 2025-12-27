import type { ReactNode } from "react";
import { ReacordElement } from "../internal/element";
import type { MessageOptions, TextDisplayComponent } from "../internal/message";
import { Node } from "../internal/node";

export interface TextDisplayProps {
	children?: ReactNode;
}

export function TextDisplay(props: TextDisplayProps) {
	return (
		<ReacordElement props={props} createNode={(p) => new TextDisplayNode(p)}>
			{props.children}
		</ReacordElement>
	);
}

class TextDisplayNode extends Node<TextDisplayProps> {
	protected override modifyMessageOptionsInternal(
		options: MessageOptions,
	): void {
		const component: TextDisplayComponent = {
			type: "textDisplay",
			content: this.text,
		};
		options.components.push(component);
	}
}
