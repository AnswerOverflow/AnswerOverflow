import satori from 'satori';
import * as fs from 'fs';
import { NextApiRequest, NextApiResponse } from 'next';
import { renderAsync } from '@resvg/resvg-js';
import { sharedEnvs } from '@answeroverflow/env/shared';
import { findMessageResultPage } from '@answeroverflow/db';
import { z } from 'zod';
import { getSnowflakeUTCDate } from '@answeroverflow/ui/src/utils/snowflake';
import { ServerPublic } from '~api/router/server/types';

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
const makeServerIconLink = (
	server: Pick<ServerPublic, 'id' | 'icon'>,
	size: number = 64,
) => {
	if (!server.icon) return undefined;
	return `https://cdn.discordapp.com/icons/${server.id}/${server.icon}.png?size=${size}`;
};
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
	const icon = makeServerIconLink(server);

	const ServerIcon = () => {
		if (icon) {
			return (
				<img
					src={icon}
					alt="Server Icon"
					style={{
						width: '80px',
						height: '80px',
						position: 'absolute',
						top: '40px',
						right: '40px',
						borderRadius: '50%',
						border: '1px solid #8c8c8c',
					}}
				/>
			);
		}
		return null;
	};

	const Header = () => (
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
	);

	const Body = () => (
		<div
			style={{
				width: '100%',
				display: 'flex',
				flexDirection: 'column',
			}}
		>
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
					display: 'flex',
					flexDirection: 'row',
					alignItems: 'center',
					justifyContent: 'space-between',
				}}
			>
				{isSolved && (
					<svg
						xmlns="http://www.w3.org/2000/svg"
						width="24"
						height="24"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
						stroke-linecap="round"
						stroke-linejoin="round"
						className="lucide lucide-check-circle-2"
					>
						<path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z" />
						<path d="m9 12 2 2 4-4" />
					</svg>
				)}
			</div>
		</div>
	);

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
			<Header />
			<ServerIcon />
			<Body />
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
