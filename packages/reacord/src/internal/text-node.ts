import { Node } from "./node";

export class TextNode extends Node<string> {
	override get text() {
		return this.props;
	}
}
