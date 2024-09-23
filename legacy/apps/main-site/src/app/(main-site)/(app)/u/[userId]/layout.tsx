import {
	DiscordAvatar,
	makeUserIconLink,
} from '@answeroverflow/ui/src/discord-avatar';
import { Metadata } from 'next';
import { getUserPageData, Props } from './components';
import { JsonLd } from 'react-schemaorg';
import type { ProfilePage } from 'schema-dts';
import { getDate } from '@answeroverflow/ui/src/utils/snowflake';

export async function generateMetadata(
	props: Omit<Props, 'searchParams'>,
): Promise<Metadata> {
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
	props: { children: React.ReactNode } & Omit<Props, 'searchParams'>,
) {
	const { userInfo } = await getUserPageData(props);
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
						url: makeUserIconLink(userInfo, 256),
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
