import { PostHog as PostHogQueryClient } from "@typelytics/posthog";
import { events } from "./events";

const posthogPersonalApiKey = process.env.POSTHOG_PERSONAL_API_KEY;
const posthogProjectId = process.env.POSTHOG_PROJECT_ID;

const posthogQueryClient =
	posthogPersonalApiKey && posthogProjectId
		? new PostHogQueryClient({
				events: events,
				host: "us.posthog.com",
				apiKey: posthogPersonalApiKey,
				projectId: posthogProjectId.toString(),
			})
		: undefined;

function getPosthogQueryClientForDashboard(opts: Options) {
	return new PostHogQueryClient({
		events,
		apiKey: posthogPersonalApiKey!,
		projectId: posthogProjectId!.toString(),
		globalFilters: {
			filters: {
				compare: "exact",
				property: "Server Id",
				value: opts.serverId,
			},
		},
		executionOptions: {
			type: "line",
			// @ts-expect-error
			date_to: opts.to?.toISOString().split("T")[0]!,
			// @ts-expect-error
			date_from: opts.from?.toISOString().split("T")[0]!,
		},
	});
}

type Options = {
	serverId: string;
	to?: Date;
	from?: Date;
};

export type BaseProps = {
	"Answer Overflow Account Id": string;
};

export namespace Analytics {
	export const queryClient = posthogQueryClient;
	export function getTopQuestionSolversForServer(opts: Options) {
		return getPosthogQueryClientForDashboard(opts)
			.query()
			.addSeries("Solved Question", {
				sampling: "total",
			})
			.execute({
				type: "table",
				date_from: opts.from && "All time",
				breakdown_hide_other_aggregation: true,
				breakdown: "Question Solver Id",
			})
			.then((x) => x.results["Solved Question"]);
	}

	export function getTopPages(opts: Options) {
		return getPosthogQueryClientForDashboard(opts)
			.query()
			.addSeries("Message Page View", {
				sampling: "total",
			})
			.execute({
				type: "table",
				breakdown_hide_other_aggregation: true,
				refresh: true,
				breakdown: "Message Id",
			})
			.then((x) => x.results["Message Page View"]);
	}

	export function getPopularPostPages() {
		if (!posthogQueryClient) return;
		return posthogQueryClient
			.query()
			.addSeries("Message Page View", {
				sampling: "total",
			})
			.execute({
				type: "table",
				breakdown_hide_other_aggregation: true,
				refresh: true,
				date_from: "Last 30 days",
				breakdown: "Message Id",
			})
			.then((x) => x.results["Message Page View"]);
	}

	export async function getPopularServers() {
		if (!posthogQueryClient) return;
		return posthogQueryClient
			.query()
			.addSeries("Message Page View", {
				sampling: "total",
			})
			.execute({
				type: "table",
				breakdown_hide_other_aggregation: true,
				refresh: true,
				date_from: "Last 30 days",
				breakdown: "Server Id",
			})
			.then((x) => x.results["Message Page View"]);
	}

	export function getPageViewsForServer(opts: Options) {
		return getPosthogQueryClientForDashboard(opts)
			.query()
			.addSeries("Message Page View", {
				label: "Page Views",
				sampling: "total",
			})
			.execute({ type: "area" });
	}

	export function getServerInvitesClicked(opts: Options) {
		return getPosthogQueryClientForDashboard(opts)
			.query()
			.addSeries("Server Invite Click", {
				label: "Invite Clicked",
				sampling: "total",
			})
			.execute({ type: "bar" });
	}

	export function getQuestionsAndAnswers(opts: Options) {
		return getPosthogQueryClientForDashboard(opts)
			.query()
			.addSeries("Asked Question", {
				label: "Questions Asked",
				sampling: "total",
			})
			.addSeries("Solved Question", {
				label: "Questions Solved",
				sampling: "total",
			})
			.execute({ type: "area" });
	}
}
