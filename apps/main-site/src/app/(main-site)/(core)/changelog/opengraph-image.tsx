import { ImageResponse } from 'next/og';
import { AnswerOverflowLogo } from '@answeroverflow/ui/src/components/primitives/icons/answer-overflow-logo';
import { allChangelogs } from 'contentlayer/generated';
import { sortContentByDateNewestFirst } from '../../../../utils/sort-content-by-date';
export const runtime = 'edge';
export const alt = 'Changelog';
export const size = {
	width: 1200,
	height: 630,
};
export const contentType = 'image/png';

const RecentChangeLogsPreview = () => {
	const recentChangeLogs = sortContentByDateNewestFirst(allChangelogs).slice(
		0,
		3,
	);
	return (
		<div
			style={{
				display: 'flex',
				flexDirection: 'column',
				alignItems: 'center',
				justifyContent: 'center',
				gap: '20px',
				width: '100%',
			}}
		>
			{recentChangeLogs.map((changelog) => (
				<div
					key={changelog.slug}
					style={{
						fontFamily: 'Satoshi Black',
						fontSize: 30,
						textAlign: 'center',
						width: '1000px',
						justifyContent: 'center',
						borderBottom: '1px solid',
						borderColor: 'grey',
						display: 'flex',
						flexDirection: 'column',
						alignItems: 'center',
					}}
				>
					<div
						style={{
							display: 'flex',
							justifyContent: 'space-between',
							width: '100%',
						}}
					>
						<div>{changelog.title}</div>
						<div
							style={{
								fontSize: 18,
								fontFamily: 'Satoshi Regular',
							}}
						>
							{new Date(changelog.date).toLocaleDateString('en-US', {
								year: 'numeric',
								month: 'long',
								day: 'numeric',
							})}
						</div>
					</div>
					<div
						style={{
							fontFamily: 'Satoshi Regular',
							fontSize: 22,
							textAlign: 'left',
							width: '100%',
							color: 'rgba(25,25,25,0.62)',
							paddingBottom: '5px',
						}}
					>
						{changelog.description}
					</div>
				</div>
			))}
		</div>
	);
};
export default async function Image() {
	const satoshiBlack = fetch(
		new URL('../../../../styles/Satoshi-Black.ttf', import.meta.url),
	).then((res) => res.arrayBuffer());

	return new ImageResponse(
		(
			<div
				style={{
					background: 'white',
					width: '100%',
					height: '100%',
					display: 'flex',
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
						position: 'absolute',
						bottom: 20,
					}}
				>
					<RecentChangeLogsPreview />
				</div>
				<div
					style={{
						display: 'flex',
						flexDirection: 'column',
					}}
				>
					<div
						style={{
							fontFamily: 'Satoshi Black',
							fontSize: 100,
							textAlign: 'center',
							paddingBottom: 200,
						}}
					>
						Changelog
					</div>
				</div>
			</div>
		),
		{
			...size,
			fonts: [
				{
					name: 'Inter',
					data: await satoshiBlack,
					style: 'normal',
					weight: 400,
				},
			],
		},
	);
}
