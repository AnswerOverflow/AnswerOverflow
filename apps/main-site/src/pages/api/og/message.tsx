import satori from 'satori';
import * as fs from 'fs';
import { NextApiRequest, NextApiResponse } from 'next';
import { renderAsync } from '@resvg/resvg-js';
import { sharedEnvs } from '@answeroverflow/env/shared';
import { findMessageResultPage } from '@answeroverflow/db';
import { z } from 'zod';
import { getSnowflakeUTCDate } from '@answeroverflow/ui/src/utils/snowflake';

const currentPath = process.cwd();
const satoshiBLack = fs.readFileSync(
	currentPath + '/src/styles/Satoshi-Black.ttf',
);
const satoshiBold = fs.readFileSync(
	currentPath + '/src/styles/Satoshi-Bold.ttf',
);

function truncate(str: string, n: number = 30) {
	return str.length > n ? str.slice(0, n - 1) + '...' : str;
}

export default async function handler(
	req: NextApiRequest,
	res: NextApiResponse,
) {
	// NextURL is undefined for some reason
	const id = req.query.id;

	if (!id) {
		res.status(400).send('No id provided');
		return;
	}
	const parsedId = z.string().parse(id);
	const data = await findMessageResultPage(parsedId);
	if (!data) {
		res.status(400).send('No data found');
		return;
	}
	const { server, channel, thread, messages } = data;
	const rootMessage = messages.at(0)!;
	const title = thread ? thread.name : rootMessage.content;
	const isSolved = rootMessage.solutionIds.length > 0;
	const numReplies = messages.length - 1;
	const date = getSnowflakeUTCDate(rootMessage.id);
	const svg = await satori(
		<div
			style={{
				height: '100%',
				width: '100%',
				fontFamily: 'Satoshi Black',
				display: 'flex',
				flexDirection: 'column',
				alignItems: 'center',
				padding: '40px',
				backgroundColor: 'white',
			}}
		>
			{/* Header */}
			<div
				style={{
					width: '100%',

					justifyContent: 'flex-start',
					alignItems: 'center',
					display: 'flex',
				}}
			>
				<h1>{truncate(server.name)}</h1>
				<div
					style={{
						height: '32px',
						transform: 'rotate(30deg)',
						borderLeftWidth: '2px',
						marginRight: '20px',
						marginLeft: '20px',
						borderLeftColor: '#8c8c8c',
					}}
				/>

				<h2>{truncate(channel.name)}</h2>
			</div>
			{/* eslint-disable-next-line @next/next/no-img-element */}
			<img
				src={
					'https://cdn.discordapp.com/icons/222078108977594368/1ad76bddd2af468c31fdb10cbce63d74.png?size=64'
				}
				alt="Server Icon"
				style={{
					width: '80px',
					height: '80px',
					position: 'absolute',
					top: '40px',
					right: '40px',
				}}
			/>

			<p
				style={{
					fontSize: '50px',
					fontFamily: 'Satoshi Bold',
					color: 'black',
					opacity: 0.8,
					marginTop: '0px',
					width: '100%',
					textAlign: 'left',
				}}
			>
				{truncate(title, 200)}
			</p>
			<div
				style={{
					height: '100%',
					backgroundColor: 'red',
				}}
			></div>
		</div>,
		{
			width: 1200,
			height: 630,
			fonts: [
				{
					name: 'Satoshi Black',
					data: satoshiBLack,
				},
				{
					name: 'Satoshi Bold',
					data: satoshiBold,
				},
			],
		},
	);
	// eslint-disable-next-line @typescript-eslint/no-unsafe-call,@typescript-eslint/no-unsafe-member-access,@typescript-eslint/no-unsafe-assignment
	const image = await renderAsync(svg, {
		fitTo: {
			mode: 'width',
			value: 1200,
		},
	});
	// eslint-disable-next-line @typescript-eslint/no-unsafe-call,@typescript-eslint/no-unsafe-member-access,@typescript-eslint/no-unsafe-assignment
	const asPng = image.asPng();
	res.setHeader('Content-Type', 'image/png');
	res.setHeader(
		'cache-control',
		sharedEnvs.NODE_ENV === 'development'
			? 'no-cache, no-store'
			: 'public, immutable, no-transform, max-age=31536000',
	);
	res.send(asPng);
}
