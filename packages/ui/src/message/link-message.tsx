import {
	ChannelPublicWithFlags,
	MessageFull,
	MessageWithDiscordAccount,
} from '@answeroverflow/db';
import {
	MessageAuthorArea,
	MessageBlurrer,
	MessageContents,
	MessageContentWithSolution,
} from './Message';
import Link from '../ui/link';
import { Paragraph } from '../ui/paragraph';
import { cn } from '../utils/utils';
import { MessageAttachments } from './attachments';
import React from 'react';

export const LinkMessage = (
	props: {
		message: MessageWithDiscordAccount | MessageFull;
		thread?: ChannelPublicWithFlags;
		/**
		 * className passed directly to the message component
		 */
		className?: string;
	} & {
		showNoSolutionCTA?: boolean;
	},
) => {
	const { message, thread, showNoSolutionCTA } = props;
	const solution = 'solutions' in message ? message.solutions?.[0] : undefined;
	return (
		<div className={'flex w-full flex-col'}>
			<MessageBlurrer message={message}>
				<div
					className={cn(
						`discord-message lg:rounded-tl-standard w-full border-2 border-black/[.13] dark:border-white/[.13]`,
						props.className,
					)}
				>
					<div className="flex flex-col p-6">
						<div className="flex items-center gap-2">
							<MessageAuthorArea {...props} />
						</div>
						<>
							<Link href={`/m/${message.id}`} className="block w-fit">
								<Paragraph className="font-header py-2 pt-4 text-xl text-blue-700 decoration-2 hover:text-blue-600 hover:underline dark:text-blue-400 hover:dark:text-blue-500">
									{thread?.name ?? message.content.slice(0, 20).trim() + '...'}
								</Paragraph>
							</Link>
							{solution ? (
								<MessageContentWithSolution
									message={message}
									solution={solution}
									collapseContent={true}
								/>
							) : (
								<MessageContents message={message} collapseContent={true} />
							)}
						</>
						<MessageAttachments {...props} limit={1} />
					</div>
				</div>
			</MessageBlurrer>
			{!solution && showNoSolutionCTA && (
				<div className="rounded-b-standard w-full border-2 border-t-0 border-black/[.13] bg-white/[.01] lg:rounded-br-none dark:border-white/[.13]">
					<Paragraph className="font-body text-primary/75 p-6">
						No replies marked as solution...{' '}
						<Link
							href={`/m/${message.id}`}
							className="text-primary font-bold underline"
						>
							View thread
						</Link>
					</Paragraph>
				</div>
			)}
		</div>
	);
};
