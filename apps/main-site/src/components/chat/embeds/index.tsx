"use client";

import { Component, type ComponentType, type ReactNode } from "react";
import { InlineServerCard } from "./inline-server-card";
import { InlineMessageCard, InlineThreadCard } from "./inline-thread-card";

export { InlineServerCard } from "./inline-server-card";
export { InlineMessageCard, InlineThreadCard } from "./inline-thread-card";

type InlineCardElement = {
	id?: string;
	children?: ReactNode;
};

type CardProps = {
	id?: string;
	children?: ReactNode;
};

function parseId(id: string | undefined): string | undefined {
	if (!id) return undefined;
	return id.replace(/^user-content-/, "");
}

class InlineCardErrorBoundary extends Component<
	{ children: ReactNode; cardType: string; id: string },
	{ hasError: boolean; error: Error | null }
> {
	constructor(props: { children: ReactNode; cardType: string; id: string }) {
		super(props);
		this.state = { hasError: false, error: null };
	}

	static getDerivedStateFromError(error: Error) {
		return { hasError: true, error };
	}

	render() {
		if (this.state.hasError) {
			return (
				<span className="block rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
					Failed to load {this.props.cardType} (ID: {this.props.id})
					{this.state.error && (
						<span className="mt-1 block text-xs opacity-75">
							{this.state.error.message}
						</span>
					)}
				</span>
			);
		}

		return this.props.children;
	}
}

function MessageCard({ id: rawId }: CardProps) {
	const id = parseId(rawId);
	if (!id) {
		return (
			<span className="block rounded-lg border border-border bg-muted/50 p-4 text-sm text-muted-foreground">
				Missing message ID
			</span>
		);
	}

	return (
		<InlineCardErrorBoundary cardType="message" id={id}>
			<InlineMessageCard id={id} />
		</InlineCardErrorBoundary>
	);
}

function ThreadCard({ id: rawId }: CardProps) {
	const id = parseId(rawId);
	if (!id) {
		return (
			<span className="block rounded-lg border border-border bg-muted/50 p-4 text-sm text-muted-foreground">
				Missing thread ID
			</span>
		);
	}

	return (
		<InlineCardErrorBoundary cardType="thread" id={id}>
			<InlineThreadCard id={id} />
		</InlineCardErrorBoundary>
	);
}

function ServerCard({ id: rawId }: CardProps) {
	const id = parseId(rawId);
	if (!id) {
		return (
			<span className="block rounded-lg border border-border bg-muted/50 p-4 text-sm text-muted-foreground">
				Missing server ID
			</span>
		);
	}

	return (
		<InlineCardErrorBoundary cardType="server" id={id}>
			<InlineServerCard id={id} />
		</InlineCardErrorBoundary>
	);
}

export const inlineCardComponents: Record<
	"message-card" | "thread-card" | "server-card",
	ComponentType<InlineCardElement>
> = {
	"message-card": MessageCard,
	"thread-card": ThreadCard,
	"server-card": ServerCard,
};
