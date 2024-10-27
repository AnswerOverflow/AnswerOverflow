import { Button } from '../../ui/button';
import { CopyButton } from '../../ui/copy-button';
import { Popover, PopoverContent, PopoverTrigger } from '../../ui/popover';

import React from 'react';
import { Textarea } from '../../ui/textarea';

export function PopoverDemo(props: { defaultOpen?: boolean }) {
	const [inviteText, setInviteText] = React.useState(
		"Hey, have you heard of Answer Overflow? It's a Discord bot that lets your server channels show up in Google, here's their about page for more info: https://www.answeroverflow.com/about",
	);
	return (
		<div className={'w-full'}>
			<Popover defaultOpen={props.defaultOpen}>
				<PopoverTrigger asChild>
					<Button variant="outline" className={'w-full'}>
						Invite a server
					</Button>
				</PopoverTrigger>
				<PopoverContent className="w-96">
					<div className={'flex flex-row items-center gap-4'}>
						<Textarea
							value={inviteText}
							onChange={(e) => setInviteText(e.target.value)}
							className={'min-h-[120px] w-full'}
						/>
						<CopyButton textToCopy={inviteText} />
					</div>
				</PopoverContent>
			</Popover>
		</div>
	);
}
