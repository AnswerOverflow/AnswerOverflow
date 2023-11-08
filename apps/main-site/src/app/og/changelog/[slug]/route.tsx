import { ImageResponse } from 'next/og';
import { AnswerOverflowLogo } from '@answeroverflow/ui/src/components/primitives/icons/answer-overflow-logo';
import { notFound } from 'next/navigation';

import { allChangelogs } from '../../../../data/contentlayer';

export const runtime = 'edge';
export const preferredRegion = 'iad1';

const satoshiBold = fetch(
	new URL('../../../../styles/Satoshi-Black.ttf', import.meta.url),
).then((res) => res.arrayBuffer());
const interMedium = fetch(
	new URL('../../../../styles/Satoshi-Bold.ttf', import.meta.url),
).then((res) => res.arrayBuffer());

export async function GET(req: Request) {
	const [satoshiBoldData, interMediumData] = await Promise.all([
		satoshiBold,
		interMedium,
	]);
	const searchParams = new URL(req.url).searchParams;
	const slug = searchParams.get('slug');
	if (!slug) {
		return notFound();
	}
	const changelogEntry = allChangelogs.find(
		(changelog) => changelog.slugAsParams === slug,
	);
	if (!changelogEntry) {
		return notFound();
	}
	return new ImageResponse(
		(
			<div
				style={{
					background: 'white',
					width: '100%',
					height: '100%',
					display: 'flex',
					flexDirection: 'column',
					alignItems: 'center',
					justifyContent: 'center',
				}}
			>
				<AnswerOverflowLogo
					style={{
						fill: 'none',
						position: 'absolute',
						top: 20,
						left: 20,
						stroke: '#000',
						strokeWidth: 13,
						strokeMiterlimit: 10,
					}}
				/>
				<div
					style={{
						display: 'flex',
						flexDirection: 'column',
						alignItems: 'center',
						justifyContent: 'center',
						width: '1100px',
						marginLeft: 'auto',
						marginRight: 'auto',
					}}
				>
					<div
						style={{
							display: 'flex',
							fontFamily: 'Satoshi Black',
							fontSize: 80,
							textAlign: 'center',
						}}
					>
						{changelogEntry.title}
					</div>
					<div
						style={{
							fontFamily: 'Inter Medium',
							fontSize: 40,
							paddingTop: 20,
							textAlign: 'center',
							opacity: 0.8,
						}}
					>
						{changelogEntry.description}
					</div>
				</div>
				<div
					style={{
						fontFamily: 'Inter Medium',
						fontSize: 30,
						textAlign: 'center',
						display: 'flex',
						alignItems: 'center',
						position: 'absolute',
						bottom: 20,
					}}
				>
					Posted{' '}
					{new Date(changelogEntry.date).toLocaleDateString('en-US', {
						year: 'numeric',
						month: 'long',
						day: 'numeric',
					})}{' '}
				</div>
			</div>
		),
		{
			width: 1200,
			height: 630,
			fonts: [
				{
					name: 'Satoshi Bold',
					data: satoshiBoldData,
				},
				{
					name: 'Inter Medium',
					data: interMediumData,
				},
			],
		},
	);
}
