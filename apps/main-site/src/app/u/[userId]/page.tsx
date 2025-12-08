import { notFound } from "next/navigation";
import {
	fetchUserPageHeaderData,
	UserPageLoader,
} from "../../../components/user-page-loader";

type Props = {
	params: Promise<{ userId: string }>;
	searchParams: Promise<{ s?: string }>;
};

export default async function UserPage(props: Props) {
	const params = await props.params;
	const searchParams = await props.searchParams;

	const headerData = await fetchUserPageHeaderData(BigInt(params.userId));

	if (!headerData) {
		return notFound();
	}

	return (
		<UserPageLoader
			headerData={headerData}
			userId={params.userId}
			serverId={searchParams.s}
			basePath={`/u/${params.userId}`}
			serverFilterLabel="Explore posts from servers"
			variant="posts"
		/>
	);
}
