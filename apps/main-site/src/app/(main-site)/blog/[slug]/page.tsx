import { CodeBlock, InlineCode } from "@packages/ui/components/code";
import { Link } from "@packages/ui/components/link";
import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import React from "react";
import { blog } from "@/.source/server";
import { BlogTOC } from "@/components/blog-toc";
import { formatDate, parseDate } from "@/lib/date-utils";

const AUTHORS: Record<string, { name: string; role: string; image: string }> = {
	"AnswerOverflow Team": {
		name: "Rhys Sullivan",
		role: "Founder",
		image: "/rhys_icon.png",
	},
};

const DEFAULT_AUTHOR = {
	name: "Rhys Sullivan",
	role: "Founder",
	image: "/rhys_icon.png",
};

function getAuthorInfo(author: string | undefined) {
	if (author && author in AUTHORS) {
		return AUTHORS[author] ?? DEFAULT_AUTHOR;
	}
	return DEFAULT_AUTHOR;
}

interface BlogPostPageProps {
	params: Promise<{
		slug: string;
	}>;
}

export async function generateStaticParams() {
	return blog.map((post) => ({
		slug: post.info.path.replace(/\.mdx?$/, ""),
	}));
}

export async function generateMetadata(
	props: BlogPostPageProps,
): Promise<Metadata> {
	const params = await props.params;
	const post = blog.find(
		(p) => p.info.path.replace(/\.mdx?$/, "") === params.slug,
	);

	if (!post) {
		return {};
	}

	return {
		title: post.title,
		description: post.description,
		openGraph: {
			images: [`/og/blog?slug=${params.slug}`],
			title: post.title,
			description: post.description,
			type: "article",
			publishedTime: parseDate(post.date).toISOString(),
			authors: post.author ? [post.author] : undefined,
		},
	};
}

export default async function BlogPostPage(props: BlogPostPageProps) {
	const params = await props.params;
	const post = blog.find(
		(p) => p.info.path.replace(/\.mdx?$/, "") === params.slug,
	);

	if (!post) {
		notFound();
	}

	const Content = post.body;

	const headings =
		post.toc
			?.filter((item) => item.depth === 2)
			.map((item) => ({
				id: item.url.replace("#", ""),
				text: item.title,
			})) || [];

	return (
		<div className="container mx-auto px-4 py-12 max-w-7xl">
			<div className="flex gap-8 justify-center">
				<article className="flex-1 max-w-[720px]">
					<header className="mb-8">
						<Link
							href="/blog"
							className="text-sm text-muted-foreground hover:text-foreground transition-colors inline-block mb-6"
						>
							← All blogs
						</Link>
						<time
							dateTime={parseDate(post.date).toISOString()}
							className="text-sm text-muted-foreground block mb-3"
						>
							{formatDate(post.date)}
						</time>
						<h1 className="text-4xl font-bold mb-3">{post.title}</h1>
						{post.description && (
							<p className="text-xl text-muted-foreground mb-6">
								{post.description}
							</p>
						)}
						{(() => {
							const authorInfo = getAuthorInfo(post.author);
							return (
								<div className="flex items-center gap-3 pb-6 border-b">
									<Image
										src={authorInfo.image}
										alt={authorInfo.name}
										width={40}
										height={40}
										className="rounded-full"
									/>
									<div>
										<div className="font-semibold text-sm">
											{authorInfo.name}
										</div>
										<div className="text-xs text-muted-foreground">
											{authorInfo.role}
										</div>
									</div>
								</div>
							);
						})()}
					</header>
					<div className="prose prose-neutral dark:prose-invert max-w-none prose-p:my-3 prose-headings:mt-6 prose-headings:mb-3 prose-li:my-1 prose-ul:my-3 prose-ol:my-3">
						<Content
							components={{
								a: ({ href, children, ...props }) => {
									if (href?.startsWith("/")) {
										return (
											<Link href={href} {...props}>
												{children}
											</Link>
										);
									}
									return (
										<a
											href={href}
											target="_blank"
											rel="noopener noreferrer"
											{...props}
										>
											{children}
										</a>
									);
								},
								blockquote: ({ children, ...props }) => {
									return (
										<blockquote
											className="border-l-4 border-primary pl-4 italic my-4"
											{...props}
										>
											{children}
										</blockquote>
									);
								},
								pre: ({ children, ...props }) => {
									if (!React.isValidElement(children)) {
										return <pre {...props}>{children}</pre>;
									}
									const codeElement = children as React.ReactElement<{
										children?: string;
										className?: string;
									}>;
									const code = codeElement.props?.children;
									const className = codeElement.props?.className || "";
									const lang = className.replace(/language-/, "");

									if (typeof code === "string") {
										return <CodeBlock lang={lang} content={code.trim()} />;
									}

									return <pre {...props}>{children}</pre>;
								},
								code: ({ children, className }) => {
									if (className?.startsWith("language-")) {
										return <code className={className}>{children}</code>;
									}
									if (typeof children === "string") {
										return <InlineCode code={children} />;
									}
									return (
										<code className="bg-muted px-1.5 py-0.5 rounded text-sm">
											{children}
										</code>
									);
								},
							}}
						/>
					</div>
				</article>
				<aside className="hidden xl:block w-64 shrink-0 sticky top-[calc(var(--navbar-height)+1rem)] h-fit">
					<BlogTOC headings={headings} />
				</aside>
			</div>
		</div>
	);
}
