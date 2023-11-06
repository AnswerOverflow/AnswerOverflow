import { allChangelogs } from 'contentlayer/generated';

import { Mdx } from '../../../_components/mdx-components';
import { BlueLink } from '@answeroverflow/ui/src/components/primitives/ui/blue-link';
import { sortContentByDateNewestFirst } from '../../../../utils/sort-content-by-date';

export default function Page() {
	const sorted = sortContentByDateNewestFirst(allChangelogs);
	return (
		<div>
			<div className={'border-b border-primary/[.3]'}>
				<h1 className={'text-5xl'}>Changelog</h1>
				<p className={'py-4'}>
					Stay up to date about all of the changes and new updates being made to
					Answer Overflow
				</p>
			</div>
			<ul className={'divide-y divide-primary/[.3] py-4'}>
				{sorted.map((changelog) => (
					<li key={changelog.slug} className={'py-4'}>
						<span>
							Posted{' '}
							{new Date(changelog.date).toLocaleDateString('en-US', {
								year: 'numeric',
								month: 'long',
								day: 'numeric',
							})}
						</span>
						<BlueLink href={changelog.slug}>
							<h2 className={'w-fit text-3xl'}>{changelog.title}</h2>
						</BlueLink>
						<div className={'prose py-4 dark:prose-invert'}>
							<Mdx code={changelog.body.code} />
						</div>
					</li>
				))}
			</ul>
		</div>
	);
}
