import { notFound } from 'next/navigation';
import { allChangelogs, Changelog } from '../../../../../data/contentlayer';

import { Metadata } from 'next';
import { Mdx } from '../../../../_components/mdx-components';
import Link from '@answeroverflow/ui/src/ui/link';
import { HiArrowUturnLeft } from 'react-icons/hi2';
import { HiArrowLeft, HiArrowRight } from 'react-icons/hi';
import Image from 'next/image';
import { LiaTwitter } from 'react-icons/lia';
interface PostProps {
	params: {
		slug: string[];
	};
}
export const dynamic = 'force-static';

function getPostFromParams(params: PostProps['params']) {
	const slug = params?.slug?.join('/');
	const post = allChangelogs.find((post) => post.slugAsParams === slug);

	if (!post) {
		null;
	}

	return post;
}

function getNextAndPrevPosts(post: Changelog) {
	if (!post) {
		return {};
	}

	const index = allChangelogs.indexOf(post);

	const nextPost = allChangelogs[index + 1];
	const prevPost = allChangelogs[index - 1];

	return {
		nextPost,
		prevPost,
	};
}

export function generateMetadata({ params }: PostProps): Metadata {
	const post = getPostFromParams(params);

	if (!post) {
		return {};
	}

	return {
		title: `${post.title} - Answer Overflow`,
		description: post.description,
		openGraph: {
			images: [
				{
					url: `https://answeroverflow.com/og/changelog/${post.slugAsParams}`,
					width: 1200,
					height: 630,
					alt: post.title,
				},
			],
		},
	};
}

export function generateStaticParams() {
	return allChangelogs.map((post) => ({
		slug: post.slugAsParams.split('/'),
	}));
}

export default function PostPage({ params }: PostProps) {
	const post = getPostFromParams(params);

	if (!post) {
		notFound();
	}
	const { nextPost, prevPost } = getNextAndPrevPosts(post);
	const postDate = new Date(post.date);
	return (
		<div className={'grid md:grid-cols-4 md:py-6'}>
			<aside className={'py-4 md:py-0'}>
				<Link href={'/changelog'} className={'no-underline hover:underline'}>
					<div className="flex items-center text-primary">
						<HiArrowUturnLeft className={'mr-2 inline-block h-5 w-5'} />
						Back to changelog
					</div>
				</Link>
			</aside>
			<article className="prose col-span-3 dark:prose-invert  md:min-w-full">
				<span className="text-foreground/80">
					{postDate.toLocaleDateString(undefined, {
						year: 'numeric',
						month: 'long',
						day: 'numeric',
					})}
				</span>
				<h1 className="mb-2">{post.title}</h1>
				{post.description && (
					<p className="mt-0 text-xl text-slate-700 dark:text-slate-200">
						{post.description}
					</p>
				)}
				<div className={'flex items-center justify-between'}>
					<Link
						className={
							'flex  grid-cols-2 no-underline transition-all hover:underline hover:opacity-80'
						}
						href={'https://x.com/rhyssullivan'}
					>
						<Image
							src={'/rhys_icon.png'}
							alt={'Rhys'}
							height={50}
							width={50}
							className={'m-0 rounded-full '}
						/>
						<div className={' ml-2 grid w-fit grid-rows-2'}>
							<span className={'w-fit text-foreground '}>Rhys Sullivan</span>
							<span
								className={
									'w-fit text-foreground/80 no-underline hover:underline'
								}
							>
								@rhyssullivan
							</span>
						</div>
					</Link>
					<Link
						href={
							'https://twitter.com/intent/tweet?text=' +
							encodeURI(post.title) +
							'&url=' +
							'https://answeroverflow.com' +
							post.slug +
							'&via=rhyssullivan'
						}
						target={'_blank'}
						className={'ml-4'}
					>
						<LiaTwitter
							className={'h-6 w-6 text-primary hover:text-primary/80'}
						/>
					</Link>
				</div>
				<hr className="my-4" />
				<Mdx code={post.body.code} />
				<div className={'flex w-full justify-between'}>
					{prevPost ? (
						<Link href={prevPost.slug}>
							<div className="flex items-center py-2 text-primary">
								<HiArrowLeft className={'ml-2 inline-block h-5 w-5'} />
								{prevPost.title}
							</div>
						</Link>
					) : (
						<div />
					)}
					{nextPost && (
						<Link href={nextPost.slug}>
							<div className="flex items-center py-2 text-primary">
								{nextPost.title}
								<HiArrowRight className={'ml-2 inline-block h-5 w-5'} />
							</div>
						</Link>
					)}
				</div>
			</article>
		</div>
	);
}
