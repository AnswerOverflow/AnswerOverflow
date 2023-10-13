import { findServerByCustomDomain } from '@answeroverflow/db';

export default function Layout({
	children,
	params,
}: {
	children: React.ReactNode;
	params: { domain: string };
}) {
	void findServerByCustomDomain(decodeURIComponent(params.domain));
	return children;
}
