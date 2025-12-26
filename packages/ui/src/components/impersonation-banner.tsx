"use client";

import { useRouter } from "next/navigation";
import { Button } from "./button";
import { useAuthClient, useSession } from "./convex-client-provider";

const BANNER_HEIGHT = "40px";

export function useIsImpersonating() {
	const { data: session } = useSession({ allowAnonymous: false });
	return Boolean(session?.session?.impersonatedBy);
}

export function ImpersonationBanner() {
	const router = useRouter();
	const authClient = useAuthClient();
	const { data: session } = useSession({ allowAnonymous: false });

	const isImpersonating = session?.session?.impersonatedBy;

	if (!isImpersonating) {
		return null;
	}

	const handleStopImpersonating = async () => {
		await authClient.admin.stopImpersonating();
		router.refresh();
		window.location.reload();
	};

	return (
		<>
			<div
				className="fixed top-0 left-0 right-0 z-40 bg-amber-500 text-amber-950 px-4 py-2 flex items-center justify-center gap-4"
				style={{ height: BANNER_HEIGHT }}
			>
				<span className="font-medium">
					You are impersonating{" "}
					{session?.user?.name ?? session?.user?.email ?? "a user"}
				</span>
				<Button
					variant="outline"
					size="sm"
					onClick={handleStopImpersonating}
					className="bg-amber-100 border-amber-700 text-amber-900 hover:bg-amber-200 hover:text-amber-950"
				>
					Stop Impersonating
				</Button>
			</div>
			<div style={{ height: BANNER_HEIGHT }} />
		</>
	);
}
