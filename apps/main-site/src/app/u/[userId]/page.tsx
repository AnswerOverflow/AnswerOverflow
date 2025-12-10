import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { decodeCursor } from "@packages/ui/utils/cursor";
import {
	fetchUserPageHeaderData,
	UserPageLoader,
} from "../../../components/user-page-loader";

type Props = {
	params: Promise<{ userId: string }>;
	searchParams: Promise<{ s?: string; cursor?: string }>;
};

export async function generateMetadata(props: Props): Promise<Metadata> {
	const params = await props.params;
	const searchParams = await props.searchParams;
	const cursor = searchParams.cursor ? decodeCursor(searchParams.cursor) : null;

	return {
		title: "User Posts - Answer Overflow",
		description: "See posts from this user on Answer Overflow",
		alternates: {
			canonical: `/u/${params.userId}`,
		},
		robots: cursor ? "noindex, follow" : { index: false },
	};
}

export default async function UserPage(props: Props) {
	const params = await props.params;
	const searchParams = await props.searchParams;

	const headerData = await fetchUserPageHeaderData(BigInt(params.userId));

	if (!headerData) {
		return notFound();
	}

	const cursor = searchParams.cursor
		? decodeCursor(searchParams.cursor)
		: undefined;

	return (
		<UserPageLoader
			headerData={headerData}
			userId={params.userId}
			serverId={searchParams.s}
			basePath={`/u/${params.userId}`}
			serverFilterLabel="Explore posts from servers"
			cursor={cursor}
		/>
	);
}
