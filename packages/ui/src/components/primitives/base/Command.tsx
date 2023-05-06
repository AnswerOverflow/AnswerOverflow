import type React from 'react';
import { CopyIcon } from './Icons';
import { useCopyToClipboard } from 'react-use';
import { Button } from './Button';

export const Command: React.FC<{
	/**
	 * The command to display, excluding the leading slash.
	 * @example "server-settings"
	 */
	command: string;
}> = ({ command }) => {
	const [, copy] = useCopyToClipboard();

	return (
		<div className="flex flex-col">
			<div className="flex w-max flex-row items-center justify-center gap-5 rounded-standard border-1 border-[#CBCED1] bg-[#F4F4F4] px-4 py-2 text-black dark:border-[#32353A] dark:bg-[#1F2226] dark:text-white">
				<span className="font-body text-lg">/{command}</span>
				<Button
					className="h-auto rounded-standard border-2 border-[#d4d4d4] bg-[#F2F2F2] p-1 transition-colors hover:bg-[#e6e6e6] dark:border-0 dark:bg-[#2A2E33] dark:drop-shadow-2xl dark:hover:bg-[#363b42]"
					onClick={() => copy(`/${command}`)}
					aria-label={`Copy /${command} to clipboard`}
					variant="ghost"
				>
					<CopyIcon className="h-6 w-6" />
				</Button>
			</div>
		</div>
	);
};
