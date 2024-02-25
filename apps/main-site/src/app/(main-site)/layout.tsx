import { allChangelogs } from '../../data/contentlayer';
import { sortContentByDateNewestFirst } from '../../utils/sort-content-by-date';
import { Metadata } from 'next';
import { metadata as baseMetadata } from '@answeroverflow/ui/src/layouts/root';
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
	const latestChangelog = sortContentByDateNewestFirst(allChangelogs).at(0);

	return (
		<>
			{latestChangelog &&
				latestChangelog.showInBanner &&
				latestChangelog.bannerText && (
					<div
						className={
							'hidden w-full items-center justify-center bg-primary/5 py-1 md:flex'
						}
					>
						<span className={'text-center text-sm text-primary'}>
							{latestChangelog.bannerText}
						</span>
					</div>
				)}
			{children}
		</>
	);
}
