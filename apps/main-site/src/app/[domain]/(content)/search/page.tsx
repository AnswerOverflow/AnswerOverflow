import { Suspense } from "react";
import { TenantSearchPageContent, TenantSearchSkeleton } from "./client";

export async function generateStaticParams(): Promise<
	Array<{ domain: string }>
> {
	return [{ domain: "vapi.ai" }];
}

export default function TenantSearchPage() {
	return (
		<Suspense fallback={<TenantSearchSkeleton />}>
			<TenantSearchPageContent />
		</Suspense>
	);
}
