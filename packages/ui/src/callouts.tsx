import { type GettingStartedClickProps } from '@answeroverflow/hooks/src/analytics/events';
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
		<LinkButton href="https://discord.com/oauth2/authorize?client_id=958907348389339146&permissions=328565083201&scope=bot+applications.commands">
			Add To Server
		</LinkButton>
	);
}
