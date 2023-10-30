import { useCopyToClipboard } from 'react-use';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import './copy-button-toast-styles.css';
import { Button } from './button';
import { ClipboardIcon } from '@heroicons/react/24/outline';

export const CopyButton = ({ textToCopy }: { textToCopy: string }) => {
	const [, copy] = useCopyToClipboard();
	const notify = () =>
		toast(`Copied ${textToCopy} to clipboard!`, {
			autoClose: 2500,
			type: 'success',
		});

	return (
		<>
			<Button
				onClick={() => {
					copy(textToCopy);
					notify();
				}}
				aria-label={`Copy ${textToCopy} to clipboard`}
				variant="ghost"
				size={'icon'}
			>
				<ClipboardIcon className="h-6 w-6" />
			</Button>
		</>
	);
};
