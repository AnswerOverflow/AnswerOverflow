import { makeUserIconLink } from "@packages/ui/utils/discord-avatar";
import { decodeCursor } from "@packages/ui/utils/cursor";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
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

	const headerData = await fetchUserPageHeaderData(BigInt(params.userId));
	const userName = headerData?.user.name ?? "User";
	const userAvatar = headerData?.user
		? makeUserIconLink(
				{
					id: headerData.user.id,
					avatar: headerData.user.avatar,
				},
				256,
			)
		: null;

	const title = `${userName} Posts - Answer Overflow`;
	const description = `See posts from ${userName} on Answer Overflow`;

	return {
		title,
		description,
		alternates: {
			canonical: `/u/${params.userId}`,
		},
		robots: cursor ? "noindex, follow" : { index: false },
		openGraph: {
			title,
			description,
			...(userAvatar && { images: [userAvatar] }),
		},
		twitter: {
			card: "summary",
			title,
			description,
			...(userAvatar && { images: [userAvatar] }),
		},
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
