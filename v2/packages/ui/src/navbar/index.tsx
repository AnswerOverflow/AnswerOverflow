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
import { LiaSearchSolid } from 'react-icons/lia';
import { MessagesSearchBar } from '../messages-search-bar';
import { UserSection } from './client';

export const Navbar = (props: {
	tenant: ServerPublic | undefined;
	hideIcon?: boolean;
}) => {
	const { tenant } = props;

	return (
		<header className="fixed left-0 top-0 z-[1000] h-[4rem] w-full bg-background px-4">
			<nav
				className={
					'relative z-10 flex size-full flex-1 items-center justify-between border-b-2 pb-2 md:py-2'
				}
			>
				<div>
					<Link href="/" className={props.hideIcon ? 'hidden' : ''}>
						{tenant ? (
							<div className="flex items-center space-x-2">
								<ServerIcon server={tenant} size={48} />
								<span className="font-semibold">{tenant.name}</span>
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
				{/*align search bar to absolute middle horizontally, top vertically*/}
				<Suspense>
					<MessagesSearchBar
						className={
							'absolute left-1/2 top-1/2 hidden w-full max-w-[620px] -translate-x-1/2 -translate-y-1/2 2xl:block'
						}
					/>
				</Suspense>
				<div className="flex items-center gap-2">
					<ThemeSwitcher />
					<LinkButton
						variant={'ghost'}
						size={'icon'}
						prefetch={false}
						href={'/search'}
						className={'flex items-center justify-center 2xl:hidden'}
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
					<UserSection tenant={tenant} />
				</div>
			</nav>
		</header>
	);
};
