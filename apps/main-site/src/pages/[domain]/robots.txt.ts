import type { GetServerSidePropsContext } from 'next';

export function getServerSideProps({ res, params }: GetServerSidePropsContext) {
	const domain = (params?.domain as string) ?? '';
	res.setHeader('content-type', 'text/plain');
	res.write(`User-agent: *
Allow: /
Disallow: /api/
Disallow: /dashboard/
Disallow: /oemf7z50uh7w/
Allow: /api/og/
Sitemap: https://${domain}/sitemap.xml
`);
	res.end();

	return {
		props: {},
	};
}

export default getServerSideProps;
