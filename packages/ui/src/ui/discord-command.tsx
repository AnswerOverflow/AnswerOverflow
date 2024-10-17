import type React from 'react';
import { CopyButton } from './copy-button';

export const DiscordCommand: React.FC<{
	/**
	 * The command to display, excluding the leading slash.
	 * @example "server-settings"
	 */
	command: string;
}> = ({ command }) => {
	return (
		<div className="flex flex-col">
			<div className="flex w-max flex-row items-center justify-center gap-2 rounded-standard border-1 px-4 py-2">
				<span className="font-body text-lg">/{command}</span>
				<CopyButton textToCopy={`/${command}`} />
			</div>
		</div>
	);
};
