import { DiscordAvatar } from '@answeroverflow/ui/src/discord-avatar';
import { Metadata } from 'next';
import { getUserPageData, Props } from './components';

export async function generateMetadata(props: Props): Promise<Metadata> {
	const { userInfo } = await getUserPageData(props);
	return {
		title: `${userInfo.name} Posts - Answer Overflow`,
		description: `See posts from ${userInfo.name} on Answer Overflow`,
		alternates: {
			canonical: `/u/${userInfo.id}`,
		},
		openGraph: {
			title: `${userInfo.name} Posts - Answer Overflow`,
			description: `See posts from ${userInfo.name} on Answer Overflow`,
		},
	};
}

export default async function Layout(
	props: { children: React.ReactNode } & Props,
) {
	const { userInfo } = await getUserPageData(props);
	console.log('server', props.searchParams?.s);
	return (
		<main className=" flex w-full justify-center pt-4">
			<div className="flex w-full max-w-[850px] flex-col gap-4">
				<div className="flex flex-row items-center gap-2">
					<DiscordAvatar user={userInfo} size={64} />
					<span className="text-4xl font-semibold">{userInfo.name}</span>
				</div>
				{props.children}
			</div>
		</main>
	);
}
