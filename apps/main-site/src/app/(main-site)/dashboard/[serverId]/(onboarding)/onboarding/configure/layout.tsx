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
			<main className="flex items-center justify-center p-4 md:p-8">
				<div className="w-full max-w-2xl space-y-4">
					<Skeleton className="h-8 w-48" />
					<Skeleton className="h-4 w-72" />
					<Skeleton className="h-[300px] w-full" />
				</div>
			</main>
		);
	}

	if (!session?.user) {
		return null;
	}

	return (
		<WizardProvider>
			<main className="flex items-center justify-center p-4 md:p-8">
				{children}
			</main>
		</WizardProvider>
	);
}
