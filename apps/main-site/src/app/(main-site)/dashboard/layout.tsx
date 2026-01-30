import { Suspense } from "react";
import DashboardClientLayout from "./client-layout";

function DashboardLoadingFallback() {
	return (
		<div className="min-h-screen bg-background">
			<div className="border-b h-navbar flex items-center px-4">
				<div className="h-6 w-32 bg-muted animate-pulse rounded" />
			</div>
			<div className="flex">
				<div className="hidden lg:block w-[255.44px] border-r h-[calc(100vh-4rem)]">
					<div className="p-4 space-y-2">
						<div className="h-8 w-full bg-muted animate-pulse rounded" />
						<div className="h-8 w-full bg-muted animate-pulse rounded" />
						<div className="h-8 w-full bg-muted animate-pulse rounded" />
					</div>
				</div>
				<div className="flex-1 p-6">
					<div className="space-y-4">
						<div className="h-10 w-64 bg-muted animate-pulse rounded" />
						<div className="h-64 w-full bg-muted animate-pulse rounded" />
					</div>
				</div>
			</div>
		</div>
	);
}

export default function DashboardLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	return (
		<Suspense fallback={<DashboardLoadingFallback />}>
			<DashboardClientLayout>{children}</DashboardClientLayout>
		</Suspense>
	);
}
