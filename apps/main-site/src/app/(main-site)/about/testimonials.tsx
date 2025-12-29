import { Link } from "@packages/ui/components/link";
import { unstable_cache } from "next/cache";
import { fetchTweet, type Tweet } from "react-tweet/api";
import { AddTestimonialCard } from "./client";

const TESTIMONIAL_IDS = [
	"2001595778066764211",
	"2002124605507711318",
	"2005083849550962874",
];

const getTweet = unstable_cache(
	async (id: string): Promise<Tweet | undefined> => {
		const { data } = await fetchTweet(id);
		return data;
	},
	["tweet"],
	{ revalidate: 3600 },
);

function XLogo({ className }: { className?: string }) {
	return (
		<svg viewBox="0 0 24 24" className={className} fill="currentColor">
			<path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
		</svg>
	);
}

function decodeHtmlEntities(text: string): string {
	return text
		.replace(/&amp;/g, "&")
		.replace(/&lt;/g, "<")
		.replace(/&gt;/g, ">")
		.replace(/&quot;/g, '"')
		.replace(/&#39;/g, "'");
}

function TestimonialCard({ tweet }: { tweet: Tweet }) {
	const tweetUrl = `https://x.com/${tweet.user.screen_name}/status/${tweet.id_str}`;

	return (
		<Link
			href={tweetUrl}
			className="relative flex flex-col gap-3 rounded-xl border bg-card p-4 transition-colors hover:bg-accent"
		>
			<XLogo className="absolute right-3 top-3 h-4 w-4 text-muted-foreground" />
			<p className="text-sm text-foreground pr-6">
				{decodeHtmlEntities(tweet.text)}
			</p>
			<div className="flex items-center gap-2">
				<img
					src={tweet.user.profile_image_url_https}
					alt={tweet.user.name}
					className="h-8 w-8 rounded-full"
				/>
				<span className="truncate text-sm font-medium text-foreground">
					{tweet.user.name}
				</span>
			</div>
		</Link>
	);
}

export async function TestimonialsSection() {
	const tweets = await Promise.all(TESTIMONIAL_IDS.map(getTweet));
	const validTweets = tweets.filter(
		(tweet): tweet is Tweet => tweet !== undefined,
	);

	return (
		<section className="py-16 sm:py-24">
			<div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
				<div className="text-center">
					<h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
						What People Are Saying
					</h2>
				</div>
				<div className="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
					{validTweets.map((tweet) => (
						<TestimonialCard key={tweet.id_str} tweet={tweet} />
					))}
					<AddTestimonialCard />
				</div>
			</div>
		</section>
	);
}
