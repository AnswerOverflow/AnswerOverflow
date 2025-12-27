import type { ReactNode } from "react";
import { ReacordElement } from "../internal/element";
import type {
	MessageOptions,
	SectionButtonComponent,
	SectionComponent,
	TextDisplayComponent,
	ThumbnailComponent,
} from "../internal/message";
import { Node } from "../internal/node";
import { TextNode } from "../internal/text-node";

export interface SectionProps {
	accessory?: ReactNode;
	children?: ReactNode;
}

export function Section(props: SectionProps) {
	return (
		<ReacordElement props={props} createNode={(p) => new SectionNode(p)}>
			{props.children}
			{props.accessory}
		</ReacordElement>
	);
}

export class SectionAccessoryNode extends Node<{
	accessory: ThumbnailComponent | SectionButtonComponent;
}> {
	override get text() {
		return "";
	}
}

class SectionNode extends Node<SectionProps> {
	override get text() {
		return "";
	}

	protected override modifyMessageOptionsInternal(
		options: MessageOptions,
	): void {
		const textComponents: TextDisplayComponent[] = [];
		let accessory: ThumbnailComponent | SectionButtonComponent | undefined;

		for (const child of this.children) {
			if (child instanceof TextNode) {
				const text = child.props;
				if (text.trim()) {
					textComponents.push({
						type: "textDisplay",
						content: text,
					});
				}
			} else if (child instanceof SectionAccessoryNode) {
				accessory = child.props.accessory;
			} else {
				const childOptions: MessageOptions = { components: [] };
				child.modifyMessageOptions(childOptions);
				for (const component of childOptions.components) {
					if (component.type === "textDisplay") {
						textComponents.push(component);
					} else if (component.type === "thumbnail") {
						accessory = component;
					}
				}
			}
		}

		const section: SectionComponent = {
			type: "section",
			components: textComponents,
			accessory,
		};

		options.components.push(section);
	}
}
