import type { ServerPublic } from '@answeroverflow/api';
import Head from 'next/head';
import { makeServerIconLink } from './ServerIcon';
import { useTenantContext } from '@answeroverflow/hooks';
import { webClientEnv } from '@answeroverflow/env/web';

interface HeadProps {
	title: string;
	description?: string;
	image?: string;
	addPrefix?: boolean;
	imageWidth?: string;
	imageHeight?: string;
	type?: string;
	server?: ServerPublic;
	path: string;
}

export const AOHead = ({
	title,
	description,
	image,
	server = undefined,
	addPrefix: addPrefix = false,
	imageWidth: imageWidth = '1200',
	imageHeight: imageHeight = '630',
	type = 'website',
	path,
}: HeadProps) => {
	const { tenant } = useTenantContext();
	if (tenant) {
		server = tenant;
	}

	if (description === undefined) {
		if (tenant) {
			description = `View the ${tenant.name} Discord server on the web. Browse questions asked by the community and find answers.`;
		} else {
			description =
				'Build the best Discord support server with Answer Overflow. Index your content into Google, answer questions with AI, and gain insights into your community.';
		}
	}
	if (!image) {
		if (server) {
			const serverIconImage = makeServerIconLink(server, 256);
			imageWidth = '256';
			imageHeight = '256';
			if (serverIconImage) {
				image = serverIconImage;
			} else {
				image = 'https://www.answeroverflow.com/answer_overflow_icon_256.png';
			}
		} else {
			image = 'https://www.answeroverflow.com/answer-overflow-banner-v3.png';
		}
	}
	if (addPrefix) title += tenant ? ` - ${tenant.name}` : ' - Answer Overflow';
	const baseDomain = `https://${
		tenant?.customDomain ?? 'www.answeroverflow.com'
	}/`;
	description =
		description.length > 160 ? description.slice(0, 160) : description;
	return (
		<Head>
			<title>{title}</title>
			{webClientEnv.NEXT_PUBLIC_DEPLOYMENT_ENV !== 'production' && (
				<meta property="robots" content="noindex" />
			)}
			<link
				rel="canonical"
				// Prevent incorrectly doing a double slash
				href={`${baseDomain}${path.startsWith('/') ? path.slice(1) : path}`}
			/>
			{tenant && (
				<link
					rel="icon"
					type="image/x-icon"
					href={makeServerIconLink(tenant, 48)}
				/>
			)}
			<meta property="description" content={description} key="desc" />
			<meta
				property="og:site_name"
				content={tenant?.name ?? 'Answer Overflow'}
			/>
			<meta property="og:title" content={title} />
			<meta property="og:type" content={type} />
			<meta property="og:description" content={description} />
			<meta property="og:image" content={image} />
			<meta property="og:image:width" content={imageWidth} />
			<meta property="og:image:height" content={imageHeight} />
			<meta property="robots" content="index,follow" />
			{!server && (
				<meta property="twitter:card" content="summary_large_image" />
			)}
			<meta property="twitter:title" content={title} />
			<meta property="twitter:description" content={description} />
			<meta property="twitter:image" content={image} />
		</Head>
	);
};

export default AOHead;
