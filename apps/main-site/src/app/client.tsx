"use client";

import { api } from "@packages/database/convex/_generated/api";
import { ConvexInfiniteList } from "@packages/ui/components/convex-infinite-list";
import {
	ThreadCard,
	ThreadCardSkeletonList,
} from "@packages/ui/components/thread-card";
import { useConvexAuth } from "convex/react";

export function HomePageClient() {
	const auth = useConvexAuth();

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

				{auth.isAuthenticated ? (
					<ConvexInfiniteList
						query={api.public.search.getRecentThreads}
						queryArgs={{}}
						pageSize={20}
						renderItem={(threadData) => {
							if (!threadData.thread) return null;
							return (
								<ThreadCard
									key={threadData.thread.id.toString()}
									result={threadData}
								/>
							);
						}}
						loader={<ThreadCardSkeletonList />}
					/>
				) : (
					<div className="rounded-lg border border-border bg-card p-8 text-center">
						<p className="text-muted-foreground">
							Please sign in to view recent threads.
						</p>
					</div>
				)}
			</div>
		</div>
	);
}
