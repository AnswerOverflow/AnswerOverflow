import { useState } from 'react';
import type { AllPageIndex } from './GetStartedSectionPages';

export interface GetStartedPageProps {
	setPage: (pageIndex: AllPageIndex) => void;
	setProgress: (progress: number) => void;
}

export interface GetStartedPage {
	pageIndex: AllPageIndex;
	component: React.FC<GetStartedPageProps> | undefined;
}

export interface GetStartedPageHandlerProps {
	pages: readonly GetStartedPage[];
	initialPageIndex?: AllPageIndex;
	setProgress: (progress: number) => void;
}

export const GetStartedPageHandler: React.FC<GetStartedPageHandlerProps> = ({
	pages,
	initialPageIndex,
	setProgress,
}) => {
	const [currentPage, setCurrentPage] = useState(
		initialPageIndex ?? 'introPage',
	);

	return (
		<div className="flex h-full flex-col items-center justify-center">
			{pages.map((page) => {
				return page.pageIndex === currentPage
					? page.component && (
							<page.component
								key={`get-started-modal-page-${page.pageIndex}`}
								setPage={(pageIndex) => setCurrentPage(pageIndex)}
								setProgress={(progress) => setProgress(progress)}
							/>
					  )
					: null;
			})}
		</div>
	);
};
