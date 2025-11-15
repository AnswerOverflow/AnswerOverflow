"use client";

import type { Server } from "@packages/database/convex/schema";
import { Button } from "@packages/ui/components/button";
import { ServerIcon } from "@packages/ui/components/server-icon";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function HomePageClient(props: { featuredServers: Server[] }) {
	const router = useRouter();
	const [searchQuery, setSearchQuery] = useState("");
	const featuredServers = props.featuredServers;

	const handleSearch = (e: React.FormEvent) => {
		e.preventDefault();
		if (searchQuery.trim()) {
			router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
		}
	};

	return (
		<div className="min-h-[calc(100vh-4rem)] bg-gradient-to-b from-gray-50 to-white dark:from-gray-900 dark:to-gray-800">
			{/* Hero Section */}
			<div className="max-w-6xl mx-auto px-8 py-16">
				<div className="text-center mb-12">
					<h1 className="text-5xl md:text-6xl font-bold mb-6 text-gray-900 dark:text-white">
						Search all of Discord
					</h1>
					<p className="text-xl text-gray-600 dark:text-gray-300 mb-8 max-w-2xl mx-auto">
						Answer Overflow is a Discord search engine. Find results from
						indexed content or discover communities to join.
					</p>

					{/* Search Bar */}
					<form onSubmit={handleSearch} className="max-w-2xl mx-auto mb-8">
						<div className="flex gap-2">
							<input
								type="search"
								value={searchQuery}
								onChange={(e) => setSearchQuery(e.target.value)}
								placeholder="Search Discord messages..."
								className="flex-1 px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
							/>
							<Button type="submit">Search</Button>
						</div>
					</form>
				</div>

				{/* Features Grid */}
				<div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
					<div className="p-6 rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
						<h2 className="text-xl font-semibold mb-3">Browse Communities</h2>
						<p className="text-gray-600 dark:text-gray-400 mb-4">
							Browse hundreds of communities using Answer Overflow to make their
							content more accessible.
						</p>
						<Button asChild variant="outline">
							<Link href="/browse">Browse</Link>
						</Button>
					</div>
					<div className="p-6 rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
						<h2 className="text-xl font-semibold mb-3">Setup for Free</h2>
						<p className="text-gray-600 dark:text-gray-400 mb-4">
							Answer Overflow is free to use and setup for your community to
							start getting your Discord discussions indexed.
						</p>
						<Button asChild variant="outline">
							<Link href="/about">Learn More</Link>
						</Button>
					</div>
					<div className="p-6 rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
						<h2 className="text-xl font-semibold mb-3">Discover Content</h2>
						<p className="text-gray-600 dark:text-gray-400 mb-4">
							Find answers, discussions, and solutions from Discord communities
							across the web.
						</p>
						<Button asChild variant="outline">
							<Link href="/browse">Explore</Link>
						</Button>
					</div>
				</div>

				{/* Featured Servers */}
				{featuredServers.length > 0 && (
					<div className="mb-12">
						<h2 className="text-2xl font-bold mb-6 text-center">
							Popular Communities
						</h2>
						<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
							{featuredServers.slice(0, 6).map((server, idx) => (
								<Link
									key={server.discordId ?? idx}
									href={`/c/${server.discordId}`}
									className="p-4 rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 hover:border-gray-300 dark:hover:border-gray-700 transition-colors"
								>
									<div className="flex items-center gap-3">
										{server.icon ? (
											<img
												src={`https://cdn.discordapp.com/icons/${server.discordId}/${server.icon}.webp?size=64`}
												alt={server.name}
												className="w-12 h-12 rounded-full"
											/>
										) : (
											<div className="w-12 h-12 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
												<ServerIcon server={server} size={48} />
											</div>
										)}
										<div className="flex-1 min-w-0">
											<h3 className="font-semibold text-gray-900 dark:text-gray-100 truncate">
												{server.name}
											</h3>
											{server.approximateMemberCount && (
												<p className="text-sm text-gray-500 dark:text-gray-400">
													{server.approximateMemberCount.toLocaleString()}{" "}
													members
												</p>
											)}
										</div>
									</div>
								</Link>
							))}
						</div>
						<div className="text-center mt-6">
							<Button asChild variant="outline">
								<Link href="/browse">View All Communities</Link>
							</Button>
						</div>
					</div>
				)}
			</div>
		</div>
	);
}
