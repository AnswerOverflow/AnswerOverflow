"use client";

type FeaturePreviewPlaceholderProps = {
	feature:
		| "indexing"
		| "mark-solution"
		| "auto-thread"
		| "solution-instructions"
		| "solved-tags";
};

export function FeaturePreviewPlaceholder({
	feature,
}: FeaturePreviewPlaceholderProps) {
	const labels = {
		indexing: "Enable Indexing",
		"mark-solution": "Mark Solution",
		"auto-thread": "Auto Thread",
		"solution-instructions": "Solution Instructions",
		"solved-tags": "Solved Tags",
	};

	return (
		<div
			className="rounded-lg border border-dashed border-muted-foreground/25 bg-muted/30 flex flex-col items-center justify-center text-center"
			style={{ aspectRatio: "16/9", maxWidth: "100%" }}
		>
			<div className="text-muted-foreground text-sm">
				{labels[feature]} demo video placeholder
			</div>
			<div className="text-muted-foreground/50 text-xs mt-1">
				16:9 aspect ratio
			</div>
		</div>
	);
}
