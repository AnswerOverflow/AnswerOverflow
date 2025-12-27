import { ReacordElement } from "../internal/element";
import type { MessageOptions } from "../internal/message";
import { Node } from "../internal/node";

export interface FileProps {
	url: string;
	spoiler?: boolean;
}

export function File(props: FileProps) {
	return <ReacordElement props={props} createNode={(p) => new FileNode(p)} />;
}

class FileNode extends Node<FileProps> {
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
			url: this.props.url,
			spoiler: this.props.spoiler,
		});
	}
}
