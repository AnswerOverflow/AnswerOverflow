import { findServerByCustomDomain } from '@answeroverflow/db';
import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { makeServerIconLink } from '@answeroverflow/ui/src/server-icon';

export async function generateMetadata({
	params,
}: {
	params: { domain: string };
}): Promise<Metadata> {
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
	return {
		title: `${tenant.name} Community`,
		description,
		metadataBase: new URL(`https://${tenant.customDomain!}`),
		other:
			tenant.id == '864296203746803753'
				? {
						'google-site-verification':
							'oljHAdgYTW0OIkYe1hFIrUFg1ZnhCeIh9fDnXwDDYMo',
					}
				: undefined,
		icons: icon ? [icon] : undefined,
		alternates: {
			canonical: `https://${tenant.customDomain!}`,
		},
		openGraph: {
			images: [image],
			siteName: tenant.name,
		},
	};
}

export default function Layout({
	children,
	params,
}: {
	children: React.ReactNode;
	params: { domain: string };
}) {
	void findServerByCustomDomain(decodeURIComponent(params.domain));
	return <>{children}</>;
}
