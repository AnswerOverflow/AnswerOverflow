/* eslint-disable tailwindcss/no-custom-classname */
import './ModalAnimations.css';
import { useState } from 'react';
import { IntroPage } from './GetStartedSectionPages';

export interface GetStartedModalPageProps {
	setPage: (pageIndex: string) => void;
}

export interface GetStartedModalPage {
	pageIndex: string;
	component: React.FC<GetStartedModalPageProps>;
}

export const GetStartedModalPageHandler = ({
	pages,
}: {
	pages: GetStartedModalPage[];
}) => {
	const [currentPage, setCurrentPage] = useState('introPage');

	// Loop through pages and combine all their pageIndex literal string const types into a union type programmatically

	return (
		<div className="py-8">
			{pages.map((page) => {
				return page.pageIndex === currentPage ? (
					<page.component
						key={`get-started-modal-page-${page.pageIndex}`}
						setPage={(pageIndex) => setCurrentPage(pageIndex)}
					/>
				) : (
					<IntroPage setPage={(pageIndex) => setCurrentPage(pageIndex)} />
				);
			})}
		</div>
	);
};
