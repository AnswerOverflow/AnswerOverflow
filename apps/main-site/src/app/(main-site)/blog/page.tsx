import { Card, CardContent, CardHeader } from "@packages/ui/components/card";
import { Link } from "@packages/ui/components/link";
import type { Metadata } from "next";
import { blog } from "@/.source/server";
import { formatDate, parseDate } from "@/lib/date-utils";

export const metadata: Metadata = {
	title: "Blog | AnswerOverflow",
	description:
		"Insights, updates, and best practices for making Discord knowledge accessible",
	openGraph: {
		title: "Blog | AnswerOverflow",
		description:
			"Insights, updates, and best practices for making Discord knowledge accessible",
	},
};

export default async function BlogPage() {
	const sortedPosts = [...blog].sort((a, b) => {
		const dateA = parseDate(a.date);
		const dateB = parseDate(b.date);
		return dateB.getTime() - dateA.getTime();
	});

	return (
		<div className="container mx-auto px-4 py-12 max-w-[720px]">
			<div className="mb-12">
				<h1 className="text-4xl font-bold mb-4">Blog</h1>
				<p className="text-muted-foreground text-lg">
					Insights, updates, and best practices for making Discord knowledge
					accessible
				</p>
			</div>

			<div className="space-y-6">
				{sortedPosts.map((post) => (
					<Link
						key={post.info.path}
						href={`/blog/${post.info.path.replace(/\.mdx?$/, "")}`}
						className="block transition-transform hover:scale-[1.01]"
					>
						<Card>
							<CardHeader>
								<div className="flex items-start justify-between gap-4">
									<div className="space-y-1 flex-1">
										<h2 className="text-2xl font-semibold leading-none tracking-tight">
											{post.title}
										</h2>
										<p className="text-sm text-muted-foreground">
											{formatDate(post.date)}
											{post.author && ` · ${post.author}`}
										</p>
									</div>
								</div>
							</CardHeader>
							<CardContent>
								<p className="text-muted-foreground">{post.description}</p>
								{post.tags && post.tags.length > 0 && (
									<div className="flex flex-wrap gap-2 mt-4">
										{post.tags.map((tag: string) => (
											<span
												key={tag}
												className="inline-flex items-center rounded-full bg-secondary px-2.5 py-0.5 text-xs font-medium text-secondary-foreground"
											>
												{tag}
											</span>
										))}
									</div>
								)}
							</CardContent>
						</Card>
					</Link>
				))}
			</div>
		</div>
	);
}
