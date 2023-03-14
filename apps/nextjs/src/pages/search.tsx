import { AOHead, SearchPage, trpc } from '@answeroverflow/ui';

export default function Search() {
	const results = trpc.messagePage.search.useQuery({
		query: 'SEARCH FOR THIS MESSAGE',
	});
	return (
		<>
			<AOHead
				description="Search Discord servers indexed on answer overflow"
				path="/search"
				title="Search"
			/>

			<SearchPage results={results.data} />
		</>
	);
}
