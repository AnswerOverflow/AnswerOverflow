import satori from 'satori';
import * as fs from 'fs';
import { NextApiRequest, NextApiResponse } from 'next';
import { renderAsync } from '@resvg/resvg-js';
import { sharedEnvs } from '@answeroverflow/env/shared';
import { findMessageResultPage } from '@answeroverflow/db';
import { z } from 'zod';
import { getSnowflakeUTCDate } from '@answeroverflow/ui/src/utils/snowflake';
import { ServerPublic } from '~api/router/server/types';
import { AnswerOverflowLogo } from '@answeroverflow/ui/src/components/primitives/base/AnswerOverflowLogo';

const U200D = String.fromCharCode(8205);
// eslint-disable-next-line @typescript-eslint/naming-convention
const UFE0Fg = /\uFE0F/g;
function toCodePoint(unicodeSurrogates: string) {
	const r: string[] = [];
	let c = 0,
		p = 0,
		i = 0;
	while (i < unicodeSurrogates.length) {
		c = unicodeSurrogates.charCodeAt(i++);
		if (p) {
			r.push((65536 + ((p - 55296) << 10) + (c - 56320)).toString(16));
			p = 0;
		} else if (55296 <= c && c <= 56319) {
			p = c;
		} else {
			r.push(c.toString(16));
		}
	}
	return r.join('-');
}
function getIconCode(char: string) {
	return toCodePoint(char.indexOf(U200D) < 0 ? char.replace(UFE0Fg, '') : char);
}
function loadEmoji(code: string) {
	return fetch(
		'https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/svg/' +
			code.toLowerCase() +
			'.svg',
	);
}

const currentPath = process.cwd();
const satoshiBLack = fs.readFileSync(
	currentPath + '/src/styles/Satoshi-Black.ttf',
);
const satoshiBold = fs.readFileSync(
	currentPath + '/src/styles/Satoshi-Bold.ttf',
);

const CalendarIcon = () => (
	<svg
		xmlns="http://www.w3.org/2000/svg"
		width="48"
		height="48"
		viewBox="0 0 24 24"
		opacity="0.8"
		fill="none"
		stroke="currentColor"
		strokeWidth="2"
		strokeLinecap="round"
		strokeLinejoin="round"
	>
		<rect width="18" height="18" x="3" y="4" rx="2" ry="2" />
		<line x1="16" x2="16" y1="2" y2="6" />
		<line x1="8" x2="8" y1="2" y2="6" />
		<line x1="3" x2="21" y1="10" y2="10" />
		<path d="M8 14h.01" />
		<path d="M12 14h.01" />
		<path d="M16 14h.01" />
		<path d="M8 18h.01" />
		<path d="M12 18h.01" />
		<path d="M16 18h.01" />
	</svg>
);

const SolvedIcon = () => (
	<svg
		xmlns="http://www.w3.org/2000/svg"
		width="48"
		height="48"
		viewBox="0 0 24 24"
		fill="none"
		stroke="green"
		opacity="0.8"
		strokeWidth="2"
		strokeLinecap="round"
		strokeLinejoin="round"
	>
		<path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z" />
		<path d="m9 12 2 2 4-4" />
	</svg>
);

const MessagesIcon = () => (
	<svg
		xmlns="http://www.w3.org/2000/svg"
		width="48"
		height="48"
		viewBox="0 0 24 24"
		fill="none"
		opacity="0.8"
		stroke="currentColor"
		strokeWidth="2"
		strokeLinecap="round"
		strokeLinejoin="round"
	>
		<path d="M14 9a2 2 0 0 1-2 2H6l-4 4V4c0-1.1.9-2 2-2h8a2 2 0 0 1 2 2v5Z" />
		<path d="M18 9h2a2 2 0 0 1 2 2v11l-4-4h-6a2 2 0 0 1-2-2v-1" />
	</svg>
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

	const rootMessage = messages.at(0);
	if (!rootMessage || !rootMessage.public) {
		res.status(400).send('No data found');
		return;
	}
	const title = thread ? thread.name : rootMessage.content;
	const isSolved = rootMessage.solutionIds.length > 0;
	const numReplies = messages.length - 1;
	const date = getSnowflakeUTCDate(rootMessage.id);
	const icon = makeServerIconLink(server, 96);

	const ServerIcon = () => {
		if (icon) {
			return (
				// eslint-disable-next-line @next/next/no-img-element
				<img
					src={icon}
					alt="Server Icon"
					style={{
						width: '96px',
						height: '96px',
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
				gap: '20px',
			}}
		>
			<ServerIcon />
			<h1
				style={{
					fontSize: '40px',
					opacity: 0.8,
				}}
			>
				{truncate(server.name)}
			</h1>
			<div
				style={{
					height: '32px',
					transform: 'rotate(30deg)',
					borderLeftWidth: '2px',
					borderLeftColor: '#8c8c8c',
				}}
			/>

			<h2
				style={{
					fontSize: '40px',
					opacity: 0.75,
				}}
			>
				{truncate(channel.name)}
			</h2>
		</div>
	);

	const MetaData = () => (
		<div
			style={{
				display: 'flex',
				flexDirection: 'row',
				alignItems: 'center',
				gap: '50px',
			}}
		>
			<div
				style={{
					display: 'flex',
					flexDirection: 'row',
					alignItems: 'center',
					justifyContent: 'center',
					gap: '10px',
				}}
			>
				<CalendarIcon />
				<p
					style={{
						fontSize: '30px',
						fontFamily: 'Satoshi Bold',
						color: 'black',
						textAlign: 'center',
						opacity: 0.8,
					}}
				>
					{date}
				</p>
			</div>
			<div
				style={{
					display: 'flex',
					flexDirection: 'row',
					alignItems: 'center',
					justifyContent: 'center',
					gap: '10px',
				}}
			>
				<MessagesIcon />
				<p
					style={{
						fontSize: '30px',
						fontFamily: 'Satoshi Bold',
						color: 'black',
						textAlign: 'center',
						opacity: 0.8,
					}}
				>
					{numReplies} replies
				</p>
			</div>
			{isSolved && (
				<div
					style={{
						display: 'flex',
						flexDirection: 'row',
						alignItems: 'center',
						justifyContent: 'center',
						gap: '10px',
					}}
				>
					<SolvedIcon />
					<p
						style={{
							fontSize: '30px',
							fontFamily: 'Satoshi Bold',
							color: 'black',
							textAlign: 'center',
							opacity: 0.8,
						}}
					>
						Solved
					</p>
				</div>
			)}
		</div>
	);

	const Body = () => (
		<div
			style={{
				width: '100%',
				display: 'flex',
				flexDirection: 'column',
				gap: '40px',
			}}
		>
			<p
				style={{
					fontSize: '60px',
					fontFamily: 'Satoshi Bold',
					color: 'black',
					marginTop: '0px',
					width: '100%',
					textAlign: 'left',
				}}
			>
				{truncate(title, 100)}
			</p>
			<MetaData />
		</div>
	);

	const svg = await satori(
		<div
			style={{
				height: '100%',
				width: '100%',
				fontFamily: 'Satoshi Black',
				position: 'relative',
				display: 'flex',
				flexDirection: 'column',
				alignItems: 'center',
				padding: '60px',
				backgroundColor: 'white',
				gap: '20px',
			}}
		>
			{/* Header */}
			<Header />
			<Body />
			<div
				style={{
					position: 'absolute',
					display: 'flex',
					right: '80px',
					bottom: '40px',
					gap: '20px',
					alignItems: 'center',
				}}
			>
				<AnswerOverflowLogo
					style={{
						fill: 'none',
						stroke: '#000',
						strokeWidth: 13,
						strokeMiterlimit: 10,
					}}
				/>
			</div>
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
			loadAdditionalAsset: async (code: string, text: string) => {
				if (code === 'emoji') {
					return (
						`data:image/svg+xml;base64,` +
						btoa(await (await loadEmoji(getIconCode(text))).text())
					);
				}
				// return a promise to undefined
				return new Promise(() => undefined);
			},
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
			: 'public, immutable, no-transform, max-age=86400',
	);
	res.send(asPng);
}
