import { DiscordAvatar } from '@answeroverflow/ui/discord-avatar';
import { makeUserIconLink } from '@answeroverflow/ui/discord-avatar-utils';
import { getDate } from '@answeroverflow/ui/utils/snowflake';
import { Metadata } from 'next';
import { JsonLd } from 'react-schemaorg';
import type { ProfilePage } from 'schema-dts';
import { Props, getUserPageData } from './components';

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

export default async function Layout(props: {
	children: React.ReactNode;
	params: { userId: string };
	searchParams: { s?: string };
}) {
	const { userInfo } = await getUserPageData({
		params: new Promise((resolve) => resolve({ userId: props.params.userId })),
		searchParams: new Promise((resolve) => resolve(props.searchParams)),
	});
	return (
		<main className="flex w-full justify-center pt-4">
			<JsonLd<ProfilePage>
				item={{
					'@context': 'https://schema.org',
					'@type': 'ProfilePage',
					alternateName: userInfo.name,
					dateCreated: getDate(userInfo.id).toISOString(),
					image: {
						'@type': 'ImageObject',
						url: makeUserIconLink(userInfo, 256, null),
						height: {
							'@type': 'QuantitativeValue',
							value: 256,
						},
						width: {
							'@type': 'QuantitativeValue',
							value: 256,
						},
					},
					name: userInfo.name,
					url: `https://www.answeroverflow.com/u/${userInfo.id}`,
					mainEntity: {
						'@type': 'Person',
						identifier: userInfo.id,
						name: userInfo.name,
						url: `https://www.answeroverflow.com/u/${userInfo.id}`,
					},
				}}
			/>

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
