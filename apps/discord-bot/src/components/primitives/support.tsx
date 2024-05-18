import { Button, Link } from '@answeroverflow/discordjs-react';
import React from 'react';
import { useHistory } from './router';

import {
	DISCORD_EMOJI_ID,
	DISCORD_LINK,
	DOCS_URL,
	GITHUB_LINK,
} from '@answeroverflow/constants';
import { ephemeralReply } from '../../utils/utils';

export const SupportMenu: React.FC = () => (
	<>
		<Link label="Docs" url={DOCS_URL} emoji="📃" />
		<Link
			label="Bugs, features & suggestions"
			url={GITHUB_LINK}
			emoji="<:github:860914920102166578>"
		/>
		<Link label="Support server" url={DISCORD_LINK} emoji={DISCORD_EMOJI_ID} />
		<Link
			label="Schedule a call"
			url="https://cal.com/answeroverflow"
			emoji="<:calcom:1081058061038403614>"
		/>
	</>
);

export const OpenSupportMenuButton: React.FC = () => {
	const { pushHistory } = useHistory();
	return (
		<Button
			// eslint-disable-next-line @typescript-eslint/no-misused-promises
			onClick={(interaction) => {
				const replaceMenu = false;
				if (replaceMenu) {
					pushHistory(<SupportMenu />);
				} else {
					ephemeralReply(<SupportMenu />, interaction);
				}
			}}
			style="Secondary"
			label="Support"
		/>
	);
};
