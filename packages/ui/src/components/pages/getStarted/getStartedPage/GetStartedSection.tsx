import { useState } from 'react';

export interface GetStartedModalPageProps {
	setPage: (pageIndex: 'introPage' | 'pickPlanPage') => void;
}

export interface GetStartedModalPage {
	pageIndex: string;
	component: React.FC<GetStartedModalPageProps>;
}

export const GetStartedModalPageHandler = ({
	pages,
	initialPageIndex,
}: {
	pages: GetStartedModalPage[];
	initialPageIndex?: string;
}) => {
	const [currentPage, setCurrentPage] = useState(
		initialPageIndex ?? 'introPage',
	);

	return (
		<div className="py-8">
			<div className="flex flex-col items-center justify-center">
				{pages.map((page) => {
					return page.pageIndex === currentPage ? (
						<page.component
							key={`get-started-modal-page-${page.pageIndex}`}
							setPage={(pageIndex) => setCurrentPage(pageIndex)}
						/>
					) : null;
				})}
			</div>
		</div>
	);
};
