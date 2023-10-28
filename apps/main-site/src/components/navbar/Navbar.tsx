import Link from '~ui/components/primitives/base/Link';
import React, { Suspense } from 'react';
import { GetStarted } from '@answeroverflow/ui/src/components/primitives/Callouts';
import { ThemeSwitcher } from '@answeroverflow/ui/src/components/primitives/ThemeSwitcher';
import { GitHubIcon } from '@answeroverflow/ui/src/components/primitives/base/Icons';
import { GITHUB_LINK } from '@answeroverflow/constants/src/links';
import { ServerIcon } from '@answeroverflow/ui/src/components/primitives/ServerIcon';
import { AnswerOverflowLogo } from '@answeroverflow/ui/src/components/primitives/base/AnswerOverflowLogo';
import type { ServerPublic } from '@answeroverflow/api/src/router/server/types';
import { LinkButton } from '@answeroverflow/ui/src/components/primitives/base/LinkButton';
import { SignInButton } from './sign-in-button';

import { getServerSession } from '@answeroverflow/auth';
import { ClientUserAvatar } from './client';

export async function UserSection(props: { tenant: ServerPublic | undefined }) {
	const session = await getServerSession();
	if (!session) return <SignInButton tenant={props.tenant} />;
	return (
		<Suspense>
			<ClientUserAvatar user={session.user} tenant={props.tenant} />
		</Suspense>
	);
}

export const Navbar = (props: {
	tenant: ServerPublic | undefined;
	hideIcon?: boolean;
}) => {
	const { tenant } = props;

	return (
		<nav
			className={
				'relative z-10  flex min-h-[4rem] w-full flex-1 items-center justify-between px-3 sm:px-[4rem] md:py-2 2xl:px-[6rem]'
			}
		>
			<Link href="/" className={props.hideIcon ? 'hidden' : ''}>
				{tenant ? (
					<div className="flex items-center space-x-2">
						<ServerIcon server={tenant} />
						<span className="font-bold">{tenant.name}</span>
					</div>
				) : (
					<>
						<div className={'w-40 md:w-56'}>
							<AnswerOverflowLogo width={'full'} />
						</div>
						<span className="sr-only">Answer Overflow Logo</span>
					</>
				)}
			</Link>
			<div className="flex items-center gap-2">
				<ThemeSwitcher />
				<LinkButton variant={'ghost'} size={'icon'} href={'/search'}>
					<GitHubIcon className="h-8 w-8" />
					<span className="sr-only">Search Answer Overflow</span>
				</LinkButton>
				{!tenant && (
					<>
						<LinkButton
							className={'hidden md:flex'}
							variant={'ghost'}
							size={'icon'}
							href={GITHUB_LINK}
							target="_blank"
						>
							<GitHubIcon className="h-8 w-8" />
							<span className="sr-only">GitHub</span>
						</LinkButton>
						<GetStarted className={'hidden md:block'} location="Navbar" />
					</>
				)}
				<Suspense fallback={<SignInButton tenant={tenant} />}>
					<UserSection tenant={tenant} />
				</Suspense>
			</div>
		</nav>
	);
};
