import type React from 'react';
import { CopyButton } from './CopyButton';

export const Command: React.FC<{
	/**
	 * The command to display, excluding the leading slash.
	 * @example "server-settings"
	 */
	command: string;
}> = ({ command }) => {
	return (
		<div className="flex flex-col">
			<div className="flex w-max flex-row items-center justify-center rounded-standard border-1 border-[#CBCED1] bg-[#F4F4F4] px-4 py-2 text-black dark:border-[#32353A] dark:bg-[#1F2226] dark:text-white">
				<span className="font-body text-lg">/{command}</span>
				<CopyButton textToCopy={`/${command}`} />
			</div>
		</div>
	);
};
