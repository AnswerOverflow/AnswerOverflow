import { useCopyToClipboard } from 'react-use';
import 'react-toastify/dist/ReactToastify.css';
import './copy-button-toast-styles.css';
import { Button } from './button';
import { ClipboardIcon } from '@heroicons/react/24/outline';
import { ClipboardCheckIcon } from 'lucide-react';
import React from 'react';

export const CopyButton = ({ textToCopy }: { textToCopy: string }) => {
	const [, copy] = useCopyToClipboard();
	const [hasCopied, setHasCopied] = React.useState(false);

	return (
		<>
			<Button
				onClick={() => {
					copy(textToCopy);
					setHasCopied(true);
					setTimeout(() => setHasCopied(false), 1000);
				}}
				aria-label={`Copy ${textToCopy} to clipboard`}
				variant="ghost"
				size={'icon'}
				className={'transition-all duration-700 ease-in-out'}
			>
				{hasCopied ? (
					<ClipboardCheckIcon className={'size-6 text-emerald-500'} />
				) : (
					<ClipboardIcon className={'size-6'} />
				)}
			</Button>
		</>
	);
};
