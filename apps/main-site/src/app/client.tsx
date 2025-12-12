import type { SearchResult } from "@packages/database/convex/shared/dataAccess";
import { ThreadCard } from "@packages/ui/components/thread-card";

export function HomePageClient({
	initialThreads,
}: {
	initialThreads: SearchResult[];
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
					<ThreadCard
						key={result.message.message.id.toString()}
						result={result}
					/>
				))}
			</div>
		</div>
	);
}
