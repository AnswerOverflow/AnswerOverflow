import { ReacordElement } from "../internal/element";
import type { MessageOptions, ThumbnailComponent } from "../internal/message";
import { Node } from "../internal/node";

export interface ThumbnailProps {
	url: string;
	description?: string;
	spoiler?: boolean;
}

export function Thumbnail(props: ThumbnailProps) {
	return (
		<ReacordElement props={props} createNode={(p) => new ThumbnailNode(p)} />
	);
}

class ThumbnailNode extends Node<ThumbnailProps> {
	override get text() {
		return "";
	}

	protected override modifyMessageOptionsInternal(
		options: MessageOptions,
	): void {
		const thumbnail: ThumbnailComponent = {
			type: "thumbnail",
			url: this.props.url,
			description: this.props.description,
			spoiler: this.props.spoiler,
		};
		options.components.push(thumbnail);
	}
}
