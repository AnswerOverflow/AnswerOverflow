import { Database } from "@packages/database/database";
import { Effect } from "effect";
import type { Metadata } from "next";
import { runtime } from "../../../../lib/runtime";

type Props = {
	params: Promise<{ domain: string }>;
	children: React.ReactNode;
};

export async function generateMetadata(props: Props): Promise<Metadata> {
	const params = await props.params;
	const domain = decodeURIComponent(params.domain);

	const tenantData = await Effect.gen(function* () {
		const database = yield* Database;
		return yield* database.public.servers.getServerByDomain({ domain });
	}).pipe(runtime.runPromise);

	const serverName = tenantData?.server?.name ?? "this community";

	const title = `Search - ${serverName}`;
	const description = `Search for answers to your questions in ${serverName}. Find indexed Discord messages and discussions.`;

	return {
		title,
		description,
		robots: {
			index: false,
			follow: true,
		},
		openGraph: {
			title,
			description,
		},
		twitter: {
			card: "summary",
			title,
			description,
		},
	};
}

export default function TenantSearchLayout({ children }: Props) {
	return children;
}
