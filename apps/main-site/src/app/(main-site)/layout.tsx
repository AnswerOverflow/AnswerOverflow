import { metadata as baseMetadata } from '@answeroverflow/ui/layouts/root';
import { Metadata } from 'next';
export const metadata: Metadata = {
	...baseMetadata,
	other: {
		'google-adsense-account': 'ca-pub-1392153990042810',
	},
};

export default function AnnouncementBannerLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	return children;
}
