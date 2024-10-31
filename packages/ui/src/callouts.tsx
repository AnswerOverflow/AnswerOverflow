import { sharedEnvs } from '@answeroverflow/env/shared';
import { GettingStartedClickProps } from './hooks/events';
import { LinkButton, LinkButtonProps } from './ui/link-button';

export function GetStarted(
	props: Omit<LinkButtonProps, 'href'> & {
		location: GettingStartedClickProps['Button Location'];
	},
) {
	return (
		<LinkButton
			href={'/onboarding'}
			prefetch={false}
			variant="outline"
			{...props}
		>
			{props.children || 'Add Your Server'}
		</LinkButton>
	);
}

export function AddToServerButton() {
  return (
    <LinkButton href={`https://discord.com/oauth2/authorize?client_id=${sharedEnvs.NEXT_PUBLIC_DISCORD_CLIENT_ID}&permissions=328565083201&scope=bot+applications.commands`}>
			Add To Server
		</LinkButton>
	);
}
