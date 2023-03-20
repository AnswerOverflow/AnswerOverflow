import { Button, Link } from '@answeroverflow/discordjs-react';
import React from 'react';
import { useHistory } from './router';
import { ephemeralReply } from '~discord-bot/utils/utils';
import { DISCORD_LINK, GITHUB_LINK } from '@answeroverflow/constants';

export const SupportMenu: React.FC = () => (
	<>
		{/*
      Disable docs until they are ready
    <Link label="Docs" url="https://docs.answeroverflow.com" emoji="📃" />
    */}
		<Link
			label="Bugs, features & suggestions"
			url={GITHUB_LINK}
			emoji="<:github:860914920102166578>"
		/>
		<Link
			label="Support server"
			url={DISCORD_LINK}
			emoji="<:discord:860914920215412756>"
		/>
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
