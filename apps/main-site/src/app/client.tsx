import type { SearchResult } from "@packages/database/convex/shared/dataAccess";
import type { Doc } from "@packages/database/convex/_generated/dataModel";
import { ThreadCard } from "@packages/ui/components/thread-card";

type ThreadResult = SearchResult & {
	thread: Doc<"channels">;
};

export function HomePageClient({
	initialThreads,
}: {
	initialThreads: ThreadResult[];
}) {
	return (
		<div className="min-h-screen bg-background">
			<div className="max-w-4xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
				<div className="mb-8">
					<h1 className="text-3xl font-bold text-foreground mb-2">
						Recent Threads
					</h1>
					<p className="text-muted-foreground">
						Live feed of Discord threads as they come in
					</p>
				</div>

				{initialThreads.map((result) => (
					<ThreadCard key={result.thread.id.toString()} result={result} />
				))}
			</div>
		</div>
	);
}
