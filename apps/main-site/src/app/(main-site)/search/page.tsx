import { Footer } from '@answeroverflow/ui/footer';
import { Navbar } from '@answeroverflow/ui/navbar/index';
import { SearchPage } from '@answeroverflow/ui/pages/SearchPage';
import { callAPI } from '@answeroverflow/ui/utils/trpc';
import { Metadata } from 'next';
import { ZeroState } from './zero-state';

type Props = {
	searchParams: Promise<{
		q?: string | string[];
		s?: string | string[];
	}>;
};

export async function generateMetadata(props: Props): Promise<Metadata> {
	const searchParams = await props.searchParams;
	const query = searchParams.q ? (searchParams.q as string) : undefined;
	return {
		title: query
			? `Search Results for "${query}" - Answer Overflow`
			: 'Search - Answer Overflow',
		description: 'Search for answers to your questions on Answer Overflow.',
		openGraph: {
			title: query
				? `Search Results for "${query}" - Answer Overflow`
				: 'Search - Answer Overflow',
			description: 'Search for answers to your questions on Answer Overflow.',
		},
	};
}

export default async function Search(props: Props) {
	const searchParams = await props.searchParams;
	if (!searchParams.q || searchParams.q.length === 0) {
		return <ZeroState />;
	}

	const results = await callAPI({
		apiCall: (api) =>
			api.messages.search({
				query: searchParams.q ? (searchParams.q as string) : '',
				serverId: searchParams.s ? (searchParams.s as string) : undefined,
			}),
	});
	return (
		<div className="mx-auto flex w-full flex-col items-center bg-background font-body">
			<div className="w-full max-w-screen-2xl justify-center">
				<Navbar tenant={undefined} />
				<div className="mt-16 px-4 sm:px-[4rem] 2xl:px-[6rem]">
					<SearchPage results={results} tenant={undefined} />
				</div>
				<Footer tenant={undefined} />
			</div>
		</div>
	);
}
