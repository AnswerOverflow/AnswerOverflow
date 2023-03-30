import type { APIMessageWithDiscordAccount } from '@answeroverflow/api';
import { useEffect, useRef } from 'react';
import { useOnClickOutside } from 'usehooks-ts';

export interface MessageModalProps {
	attachment:
		| APIMessageWithDiscordAccount['attachments'][number]
		| undefined
		| null;
	isOpen: boolean;
	setIsOpen: (isOpen: boolean) => void;
}

export const MessageModal = ({
	attachment,
	isOpen,
	setIsOpen,
}: MessageModalProps) => {
	return (
		<MessageModalRenderer
			attachment={attachment}
			isOpen={isOpen}
			setIsOpen={setIsOpen}
		/>
	);
};

const CloseIcon = () => {
	return (
		<svg
			xmlns="http://www.w3.org/2000/svg"
			fill="none"
			viewBox="0 0 24 24"
			strokeWidth={1.5}
			stroke="currentColor"
			className="h-6 w-6"
		>
			<path
				strokeLinecap="round"
				strokeLinejoin="round"
				d="M6 18L18 6M6 6l12 12"
			/>
		</svg>
	);
};

const MessageModalRenderer = ({
	attachment,
	isOpen,
	setIsOpen,
}: MessageModalProps) => {
	const imageRef = useRef<HTMLImageElement>(null);

	// Make background not scrollable when modal is open
	useEffect(() => {
		if (isOpen) {
			document.body.style.overflow = 'hidden';
		} else {
			document.body.style.overflow = 'unset';
		}
	}, [isOpen]);

	const handleClickOutside = () => {
		setIsOpen(false);
	};

	useOnClickOutside(imageRef, handleClickOutside);

	return (
		<>
			{isOpen && (
				<div className="fixed inset-0 z-50 flex h-full w-full items-center justify-center bg-black/75">
					<div
						className="relative flex h-full w-full flex-col items-center justify-center overflow-hidden rounded-lg p-4"
						onClick={() => {
							console.log('Click in main');
						}}
					>
						<div className="absolute top-0 right-0 z-[100] p-2">
							<button
								type="button"
								className="flex h-8 w-8 items-center justify-center rounded-full transition-colors duration-200 focus:outline-none focus:ring focus:ring-gray-300 hover:bg-gray-100"
								onClick={() => setIsOpen(false)}
							>
								<span className="sr-only">Close</span>
								<CloseIcon />
							</button>
						</div>
						<img
							className="max-h-vh80 w-full max-w-2xl object-contain lg:h-full xl:p-10"
							src={attachment?.url}
							alt={attachment?.description ?? 'Image'}
							ref={imageRef}
						/>
					</div>
				</div>
			)}
		</>
	);
};
