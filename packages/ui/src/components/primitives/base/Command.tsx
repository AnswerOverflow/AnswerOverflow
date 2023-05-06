import type React from 'react';
import { CopyIcon } from './Icons';
import { useCopyToClipboard } from 'react-use';

export const Command: React.FC<{
	/**
	 * The command to display, excluding the leading slash.
	 * @example "server-settings"
	 */
	command?: string;
}> = ({ command }) => {
	const [, copy] = useCopyToClipboard();

	return (
		<div className="flex flex-col">
			<div className="flex w-min flex-row items-center justify-center gap-5 rounded-standard border-1 border-[#32353A] bg-[#1F2226] px-4 py-2 text-black dark:text-white">
				<span className="font-body text-lg">/{command}</span>
				<button
					className="rounded-standard bg-[#2A2E33] p-1 drop-shadow-2xl transition-colors hover:bg-[#363b42] md:active:translate-y-0.5"
					onClick={() => {
						if (!command) return;
						copy(`/${command}`);
					}}
				>
					<CopyIcon className="h-6 w-6" />
				</button>
			</div>
		</div>
	);
};
