"use client";

type FeaturePreviewPlaceholderProps = {
	feature:
		| "indexing"
		| "mark-solution"
		| "auto-thread"
		| "solution-instructions"
		| "solved-tags";
};

const videoUrls: Record<FeaturePreviewPlaceholderProps["feature"], string> = {
	indexing:
		"https://cdn.answeroverflow.com/1450011153030713466/answeroverflow-indexing-demo.mov",
	"mark-solution":
		"https://cdn.answeroverflow.com/1450010686858985482/mark-solution-demo.mov",
	"auto-thread":
		"https://cdn.answeroverflow.com/1450016048261894237/auto-thread-demo.mov",
	"solution-instructions":
		"https://cdn.answeroverflow.com/1450016050950180939/send-mark-solution-instructions.mov",
	"solved-tags":
		"https://cdn.answeroverflow.com/1450016053139869827/solved-tag-demo.mov",
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

	const videoUrl = videoUrls[feature];

	if (videoUrl) {
		return (
			<div className="rounded-lg overflow-hidden border border-border">
				<video
					src={videoUrl}
					width={1920}
					height={1080}
					autoPlay
					loop
					muted
					playsInline
					className="w-full h-auto"
				/>
			</div>
		);
	}

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
