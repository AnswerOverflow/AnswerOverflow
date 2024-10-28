'use client';
import { ServerPublic } from '@answeroverflow/api/router/types';
import { makeMainSiteLink } from '@answeroverflow/constants/links';
import { Button, ButtonProps } from '../ui/button';
import { LinkButton } from '../ui/link-button';

export function SignInButton(
	props: ButtonProps & {
		tenant: ServerPublic | undefined;
		dashboard?: boolean;
	},
) {
	const { tenant } = props;
	if (tenant) {
		const link = makeMainSiteLink('/api/auth/tenant/signin');
		const redirect =
			typeof window !== 'undefined'
				? window.location.href
				: `http://${tenant.customDomain!}`;

		return (
			<LinkButton
				variant="outline"
				href={`${link}?redirect=${encodeURIComponent(redirect)}`}
			>
				Login
			</LinkButton>
		);
	}
	if (props.dashboard) {
		return (
			<LinkButton
				variant="outline"
				href={
					// eslint-disable-next-line n/no-process-env
					(process.env.NEXT_PUBLIC_DEPLOYMENT_ENV === 'local'
						? 'http://localhost:3000/'
						: 'https://www.answeroverflow.com/') + `app-auth`
				}
			>
				Sign In
			</LinkButton>
		);
	}
	return (
		// TODO: Swap to href
		// eslint-disable-next-line @typescript-eslint/no-misused-promises
		<Button
			variant="outline"
			onClick={() => {
				void import('next-auth/react').then(({ signIn }) => {
					void signIn('discord');
				});
			}}
			{...props}
		>
			Login
		</Button>
	);
}
