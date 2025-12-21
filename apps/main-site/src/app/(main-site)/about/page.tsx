import { Database } from "@packages/database/database";
import { SessionRecording } from "@packages/ui/analytics/client";
import { Effect } from "effect";
import type { Metadata } from "next";
import { runtime } from "../../../lib/runtime";
import { AboutPageClient } from "./client";
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

export default async function AboutPage() {
	const serversLiveData = await Effect.gen(function* () {
		const database = yield* Database;
		const liveData = yield* database.public.servers.getBrowseServers();
		return liveData;
	}).pipe(runtime.runPromise);

	const servers = serversLiveData ?? [];

	return (
		<>
			<SessionRecording />
			<AboutPageClient
				servers={servers}
				testimonialsSection={<TestimonialsSection />}
			/>
		</>
	);
}
