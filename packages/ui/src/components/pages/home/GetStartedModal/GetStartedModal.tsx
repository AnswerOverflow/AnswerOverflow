/* eslint-disable tailwindcss/no-custom-classname */
import './ModalAnimations.css';
import * as Dialog from '@radix-ui/react-dialog';
import { useState } from 'react';
import { CloseIcon } from '~ui/components/primitives/base/Icons';
import { getStartedModalPages, IntroPage } from './GetStartedModalPages';

export const GetStartedModal = () => {
	return (
		<Dialog.Portal>
			<Dialog.Overlay className="fixed inset-0 z-50 flex h-full w-full items-center justify-center bg-black/75" />

			<Dialog.Content className="fixed top-0 left-0 z-[75] flex h-full w-full flex-col items-center justify-center p-4">
				<div className="slide-in relative max-w-3xl rounded-standard px-8 py-16 dark:bg-ao-black">
					<GetStartedModalPageHandler pages={getStartedModalPages} />
					<Dialog.Close className="absolute top-2 right-2">
						<CloseIcon />
					</Dialog.Close>
				</div>
			</Dialog.Content>
		</Dialog.Portal>
	);
};

export interface GetStartedModalPageProps {
	setPage: (pageIndex: string) => void;
}

export interface GetStartedModalPage {
	pageIndex: string;
	component: React.FC<GetStartedModalPageProps>;
}

const GetStartedModalPageHandler = ({
	pages,
}: {
	pages: GetStartedModalPage[];
}) => {
	const [currentPage, setCurrentPage] = useState('introPage');

	// Loop through pages and combine all their pageIndex literal string const types into a union type programmatically

	return (
		<>
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
		</>
	);
};
