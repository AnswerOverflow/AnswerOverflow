import {
	DiscordAvatar,
	makeUserIconLink,
} from '@answeroverflow/ui/src/discord-avatar';
import { Metadata } from 'next';
import { getUserPageData, Props } from './components';
import { JsonLd } from 'react-schemaorg';
import { ProfilePage } from 'schema-dts';
import { getDate } from '@answeroverflow/ui/src/utils/snowflake';

export async function generateMetadata(props: Props): Promise<Metadata> {
	const { userInfo, server } = await getUserPageData(props);
	return {
		title: `${userInfo.name} Posts - ${server.name}`,
		description: `See posts from ${userInfo.name} in the ${server.name} Discord`,
		alternates: {
			canonical: `https://${server.customDomain}/u/${userInfo.id}`,
		},
		openGraph: {
			title: `${userInfo.name} Posts - ${server.name}`,
			description: `See posts from ${userInfo.name} in the ${server.name} Discord`,
		},
	};
}
export default async function Layout(
	props: { children: React.ReactNode } & Props,
) {
	const { userInfo, server } = await getUserPageData(props);
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
						url: makeUserIconLink(userInfo, 512),
						height: {
							'@type': 'QuantitativeValue',
							value: 512,
						},
						width: {
							'@type': 'QuantitativeValue',
							value: 512,
						},
					},
					name: userInfo.name,
					url: `https://${server.customDomain}{/u/${userInfo.id}`,
					mainEntity: {
						'@type': 'Person',
						identifier: userInfo.id,
						name: userInfo.name,
						url: `https://${server.customDomain}{/u/${userInfo.id}`,
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
