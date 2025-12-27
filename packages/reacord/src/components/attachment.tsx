import { ReacordElement } from "../internal/element";
import type { MessageOptions } from "../internal/message";
import { Node } from "../internal/node";

export interface AttachmentProps {
	name: string;
	data: Buffer | string;
	spoiler?: boolean;
}

export function Attachment(props: AttachmentProps) {
	return (
		<ReacordElement props={props} createNode={(p) => new AttachmentNode(p)} />
	);
}

class AttachmentNode extends Node<AttachmentProps> {
	override get text() {
		return "";
	}

	protected override modifyMessageOptionsInternal(
		options: MessageOptions,
	): void {
		if (!options.files) {
			options.files = [];
		}
		options.files.push({
			name: this.props.name,
			data: this.props.data,
			spoiler: this.props.spoiler,
		});
	}
}
