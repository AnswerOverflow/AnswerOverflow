import { useState } from 'react';
import type { AllPageIndex } from './GetStartedSectionPages';

export interface GetStartedPageProps {
	setPage: (pageIndex: AllPageIndex) => void;
}

export interface GetStartedPage {
	pageIndex: AllPageIndex;
	component: React.FC<GetStartedPageProps>;
}

export interface GetStartedPageHandlerProps {
	pages: readonly GetStartedPage[];
	initialPageIndex?: AllPageIndex;
}

export const GetStartedPageHandler: React.FC<GetStartedPageHandlerProps> = ({
	pages,
	initialPageIndex,
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
