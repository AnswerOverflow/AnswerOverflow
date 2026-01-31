import { Suspense } from "react";
import { TenantSearchPageContent, TenantSearchSkeleton } from "./client";

export function generateStaticParams() {
	return [{ domain: "placeholder" }];
}

export default function TenantSearchPage() {
	return (
		<Suspense fallback={<TenantSearchSkeleton />}>
			<TenantSearchPageContent />
		</Suspense>
	);
}
