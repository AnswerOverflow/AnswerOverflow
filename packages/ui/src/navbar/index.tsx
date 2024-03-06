import Link from '../ui/link';
import React, { Suspense } from 'react';
import { GetStarted } from '../callouts';
import { ThemeSwitcher } from '../theme-switcher';
import { GitHubIcon } from '../icons';
import { GITHUB_LINK } from '@answeroverflow/constants/src/links';
import { ServerIcon } from '../server-icon';
import { AnswerOverflowLogo } from '../icons/answer-overflow-logo';
import type { ServerPublic } from '@answeroverflow/api/src/router/server/types';
import { LinkButton } from '../ui/link-button';
import { SignInButton } from './sign-in-button';

import { getServerSession } from '@answeroverflow/auth';
import { ClientUserAvatar } from './client';
import { LiaSearchSolid } from 'react-icons/lia';
import { MessagesSearchBar } from '../messages-search-bar';

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
			<div>
				<Link href="/" className={props.hideIcon ? 'hidden' : ''}>
					{tenant ? (
						<div className="flex items-center space-x-2">
							<ServerIcon server={tenant} />
							<span className="font-bold">{tenant.name}</span>
						</div>
					) : (
						<>
							<div className={'w-32 md:w-40'}>
								<AnswerOverflowLogo width={'full'} />
							</div>
							<span className="sr-only">Answer Overflow Logo</span>
						</>
					)}
				</Link>
			</div>
			{/*align search bar to absolutle middle horizontally, top vertically*/}

			<MessagesSearchBar
				className={
					'absolute left-1/2 top-1/2 hidden w-full max-w-[620px] -translate-x-1/2 -translate-y-1/2  md:block'
				}
			/>

			<div className="flex items-center gap-2">
				<ThemeSwitcher />
				<LinkButton
					variant={'ghost'}
					size={'icon'}
					href={'/search'}
					className={'block md:hidden'}
				>
					<LiaSearchSolid className="h-8 w-8" />
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
