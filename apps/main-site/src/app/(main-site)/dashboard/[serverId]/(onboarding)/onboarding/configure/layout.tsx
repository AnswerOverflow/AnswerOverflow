"use client";

import { useSession } from "@packages/ui/components/convex-client-provider";
import { Skeleton } from "@packages/ui/components/skeleton";
import { useParams, useRouter } from "next/navigation";
import { useEffect } from "react";
import { WizardProvider } from "./components/wizard-context";

export default function ConfigureLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	const router = useRouter();
	const params = useParams();
	const serverId = params.serverId as string;
	const { data: session, isPending: isSessionPending } = useSession({
		allowAnonymous: false,
	});

	useEffect(() => {
		if (isSessionPending) return;

		if (!session?.user) {
			router.push(`/dashboard/${serverId}/onboarding`);
			return;
		}

		if (!serverId) {
			router.push("/dashboard");
			return;
		}
	}, [session, isSessionPending, serverId, router]);

	if (isSessionPending) {
		return (
			<main className="flex flex-col p-6 md:p-8 pt-12 md:pt-16 min-h-[calc(100vh-4rem)]">
				<div className="w-full max-w-2xl mx-auto space-y-4">
					<Skeleton className="h-8 w-48" />
					<Skeleton className="h-5 w-96 max-w-full" />
					<Skeleton className="h-[400px] w-full rounded-lg" />
					<div className="flex justify-between pt-2">
						<Skeleton className="h-10 w-20" />
						<Skeleton className="h-10 w-28" />
					</div>
				</div>
			</main>
		);
	}

	if (!session?.user) {
		return null;
	}

	return (
		<WizardProvider>
			<main className="flex flex-col p-6 md:p-8 pt-12 md:pt-16 min-h-[calc(100vh-4rem)]">
				{children}
			</main>
		</WizardProvider>
	);
}
