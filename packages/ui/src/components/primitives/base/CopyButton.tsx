import { useCopyToClipboard } from 'react-use';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import './CopyButtonToastStyles.css';
import { Button } from './Button';
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
				className="ml-5 h-auto rounded-standard border-2 border-[#d4d4d4] bg-[#F2F2F2] p-1 transition-colors hover:bg-[#e6e6e6] dark:border-0 dark:bg-[#2A2E33] dark:drop-shadow-2xl dark:hover:bg-[#363b42]"
				onClick={() => {
					copy(textToCopy);
					notify();
				}}
				aria-label={`Copy ${textToCopy} to clipboard`}
				variant="ghost"
			>
				<ClipboardIcon className="h-6 w-6" />
			</Button>
		</>
	);
};
