"use client";

import { Component, type ComponentProps, type ReactNode } from "react";
import { InlineServerCard } from "./inline-server-card";
import { InlineMessageCard, InlineThreadCard } from "./inline-thread-card";

export { InlineServerCard } from "./inline-server-card";
export { InlineMessageCard, InlineThreadCard } from "./inline-thread-card";

type DivProps = ComponentProps<"div"> & {
	"data-inline-card"?: string;
	"data-id"?: string;
	children?: ReactNode;
};

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
				<div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
					Failed to load {this.props.cardType} (ID: {this.props.id})
					{this.state.error && (
						<div className="mt-1 text-xs opacity-75">
							{this.state.error.message}
						</div>
					)}
				</div>
			);
		}

		return this.props.children;
	}
}

function InlineCardDiv(props: DivProps) {
	const cardType = props["data-inline-card"];
	const id = props["data-id"];

	if (!cardType || !id) {
		return <div {...props} />;
	}

	const renderCard = () => {
		switch (cardType) {
			case "message":
				return <InlineMessageCard id={id} />;
			case "server":
				return <InlineServerCard id={id} />;
			case "thread":
				return <InlineThreadCard id={id} />;
			default:
				return <div {...props} />;
		}
	};

	return (
		<InlineCardErrorBoundary cardType={cardType} id={id}>
			{renderCard()}
		</InlineCardErrorBoundary>
	);
}

export const inlineCardComponents = {
	div: InlineCardDiv,
};
