import { findServerByCustomDomain } from '@answeroverflow/core/server';
import { GlobalThisEmbedder } from '@answeroverflow/ui/global-this-embedder';
import { makeServerIconLink } from '@answeroverflow/ui/server-icon';
import { getServerCustomUrl } from '@answeroverflow/ui/utils/server';
import { Metadata } from 'next';
import { notFound } from 'next/navigation';

export async function generateMetadata(props: {
	params: Promise<{ domain: string }>;
}): Promise<Metadata> {
	const params = await props.params;
	// read route params
	const tenant = await findServerByCustomDomain(
		decodeURIComponent(params.domain),
	);
	if (!tenant) {
		return notFound();
	}

	const image =
		makeServerIconLink(tenant, 256) ??
		'https://www.answeroverflow.com/answer_overflow_icon_256.png';

	const description =
		tenant.description ??
		`View the ${tenant.name} Discord server on the web. Browse questions asked by the community and find answers.`;
	const icon = tenant.icon
		? `https://cdn.answeroverflow.com/${tenant.id}/${tenant.icon}/icon.png`
		: makeServerIconLink(tenant, 48);

	const customUrl = getServerCustomUrl(tenant);
	const metadataBaseUrl = customUrl
		? new URL(customUrl)
		: new URL(`https://${tenant.customDomain!}`);

	return {
		title: `${tenant.name} Community`,
		description,
		metadataBase: metadataBaseUrl,
		other:
			tenant.id == '864296203746803753'
				? {
						'google-site-verification':
							'oljHAdgYTW0OIkYe1hFIrUFg1ZnhCeIh9fDnXwDDYMo',
					}
				: undefined,
		icons: icon ? [icon] : undefined,
		alternates: {
			canonical: customUrl || `https://${tenant.customDomain!}`,
		},
		openGraph: {
			images: [image],
			siteName: tenant.name,
		},
	};
}

export default async function Layout(props: {
	children: React.ReactNode;
	params: Promise<{ domain: string }>;
}) {
	const params = await props.params;

	const { children } = props;

	const server = await findServerByCustomDomain(
		decodeURIComponent(params.domain),
	);
	console.log('subpath', server?.subpath);
	return (
		<GlobalThisEmbedder embedOnServer={{ subpath: server?.subpath }}>
			{children}
		</GlobalThisEmbedder>
	);
}
