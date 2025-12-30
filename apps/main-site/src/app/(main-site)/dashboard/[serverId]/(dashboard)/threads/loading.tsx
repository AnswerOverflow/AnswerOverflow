import { Skeleton } from "@packages/ui/components/skeleton";

export default function ThreadsLoading() {
	return (
		<div className="mx-auto max-w-[1200px] w-full space-y-6">
			<div>
				<Skeleton className="h-8 w-32" />
				<Skeleton className="h-5 w-64 mt-2" />
			</div>

			<div className="flex items-center gap-4">
				<Skeleton className="h-10 w-80" />
				<Skeleton className="h-5 w-24" />
			</div>

			<div className="border rounded-lg">
				<div className="p-4 space-y-4">
					{Array.from({ length: 10 }).map((_, i) => (
						<div key={i} className="flex items-center gap-4">
							<Skeleton className="h-5 flex-1" />
							<Skeleton className="h-5 w-24" />
							<Skeleton className="h-5 w-16" />
							<Skeleton className="h-5 w-20" />
							<Skeleton className="h-5 w-16" />
						</div>
					))}
				</div>
			</div>
		</div>
	);
}
