import { SessionRecording } from "@packages/ui/analytics/client";
import type { Metadata } from "next";
import { BrandPageClient } from "./client";

export const metadata: Metadata = {
	title: "Brand - Answer Overflow",
	description:
		"Download Answer Overflow logos and brand assets. Get the official Answer Overflow logos in light and dark themes for your projects.",
	openGraph: {
		title: "Brand - Answer Overflow",
		description:
			"Download Answer Overflow logos and brand assets. Get the official Answer Overflow logos in light and dark themes for your projects.",
	},
};

export default function BrandPage() {
	return (
		<>
			<SessionRecording />
			<BrandPageClient />
		</>
	);
}
