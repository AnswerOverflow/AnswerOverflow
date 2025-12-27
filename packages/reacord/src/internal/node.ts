import type { Effect } from "effect";
import { Container } from "./container";
import type { ComponentInteraction } from "./interaction";
import type { MessageOptions } from "./message";

export type RunEffect = <A, E, R>(effect: Effect.Effect<A, E, R>) => Promise<A>;

export abstract class Node<Props> {
	readonly children = new Container<Node<unknown>>();

	constructor(public props: Props) {}

	get text(): string {
		return this.children.map((child) => child.text).join("");
	}

	modifyMessageOptions(_options: MessageOptions): void {}

	handleComponentInteraction(
		_interaction: ComponentInteraction,
		_runEffect: RunEffect,
	): boolean {
		for (const child of this.children) {
			if (child.handleComponentInteraction(_interaction, _runEffect)) {
				return true;
			}
		}
		return false;
	}
}
