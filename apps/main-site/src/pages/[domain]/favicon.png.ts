import type { GetServerSidePropsContext } from 'next';
import { findServerByCustomDomain } from '@answeroverflow/db';
// TODO: This'd be better to just rewrite
export async function getServerSideProps({
	res,
	params,
}: GetServerSidePropsContext) {
	const domain = (params?.domain as string) ?? '';
	const server = await findServerByCustomDomain(domain);
	if (!server || !server.icon) {
		const body = { error: server ? 'Server has no icon' : 'Server not found' };
		res.setHeader('content-type', 'application/json');
		res.statusCode = 404;
		res.write(JSON.stringify(body));
		res.end();

		return {
			props: {},
		};
	}
	const img = await fetch(
		`https://cdn.discordapp.com/icons/${server.id}/${server.icon}.png?size=48`,
	);
	res.setHeader('content-type', 'image/png');
	const hourInSeconds = 60 * 60;
	res.setHeader(
		'Cache-Control',
		`public, s-maxage=10, stale-while-revalidate=${hourInSeconds}`,
	);
	const buf = await img.arrayBuffer();
	res.write(Buffer.from(buf));
	res.end();
	return {
		props: {},
	};
}

export default getServerSideProps;
