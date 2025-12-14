import { CustomEmoji, Twemoji } from "./emoji";
import type { Poll } from "./types";

// biome-ignore lint/suspicious/noRedeclare: eh
export function Poll({ poll }: { poll: Poll | null | undefined }) {
	if (!poll?.answers) {
		return null;
	}
	const totalVotes =
		Object.values(poll.answers).reduce(
			(acc, curr) => acc + curr.voteCount,
			0,
		) ?? 0;
	return (
		<div className="mt-2 space-y-3 border border-neutral-200 p-4">
			<div className="flex flex-col gap-1">
				{poll.question}
				{!poll.resultsFinalized && (
					<span className="text-neutral-700 text-sm">
						Join the server to vote
					</span>
				)}
			</div>
			<div className="space-y-2">
				{Object.entries(poll.answers).map(([key, value]) => {
					const emoji = value.emoji;
					return (
						<div
							className="cursor-pointer rounded-sm bg-neutral-100 px-4 py-2 text-neutral-800 hover:bg-neutral-200"
							key={key}
						>
							{emoji && (
								<span className="mr-3">
									{emoji.id ? (
										<CustomEmoji
											animated={emoji.animated}
											className={"size-6"}
											emojiId={emoji.id}
											key={key}
											name={emoji.name}
										/>
									) : (
										<Twemoji className="size-6" name={emoji.name} />
									)}
								</span>
							)}
							<span>{value.text}</span>
						</div>
					);
				})}
			</div>
			<div className="space-x-2 text-neutral-700 text-sm">
				<span>{totalVotes} votes</span>
				{poll.resultsFinalized && (
					<>
						<span>•</span>
						<span>Poll closed</span>
					</>
				)}
			</div>
		</div>
	);
}
