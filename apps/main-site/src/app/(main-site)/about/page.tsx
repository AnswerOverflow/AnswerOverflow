import type { Server } from "@packages/database/convex/schema";
import { Database } from "@packages/database/database";
import { SessionRecording } from "@packages/ui/analytics/client";
import { Effect } from "effect";
import type { Metadata } from "next";
import { Suspense } from "react";
import { runtime } from "../../../lib/runtime";
import { AboutPageClient, AboutPageSkeleton } from "./client";
import { TestimonialsSection } from "./testimonials";

export const metadata: Metadata = {
	title: "About - Answer Overflow",
	description:
		"Learn about Answer Overflow and how we help Discord communities make their content discoverable. Index Discord discussions into Google, answer questions with AI, and gain insights.",
	openGraph: {
		title: "About - Answer Overflow",
		description:
			"Learn about Answer Overflow and how we help Discord communities make their content discoverable. Index Discord discussions into Google, answer questions with AI, and gain insights.",
	},
};

async function fetchAboutPageServers() {
	// "use cache";

	return Effect.gen(function* () {
		const database = yield* Database;
		const browsableServers =
			yield* database.public.servers.getCachedBrowsableServers({});
		return browsableServers.map(
			(server): Server => ({
				discordId: BigInt(server.discordId),
				name: server.name,
				icon: server.icon ?? undefined,
				description: server.description ?? undefined,
				approximateMemberCount: server.approximateMemberCount,
			}),
		);
	}).pipe(runtime.runPromise);
}

async function AboutPageLoader() {
	const servers = await fetchAboutPageServers();

	return (
		<AboutPageClient
			servers={servers}
			testimonialsSection={<TestimonialsSection />}
		/>
	);
}

export default function AboutPage() {
	return (
		<>
			<SessionRecording />
			<Suspense fallback={<AboutPageSkeleton />}>
				<AboutPageLoader />
			</Suspense>
		</>
	);
}
