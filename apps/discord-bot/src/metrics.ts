import * as Metric from "effect/Metric";
import * as MetricBoundaries from "effect/MetricBoundaries";

export const commandExecuted = (commandName: string) =>
	Metric.counter("discord.commands.executed", {
		description: "Number of Discord commands executed",
	}).pipe(Metric.tagged("command", commandName));

export const commandDuration = Metric.histogram(
	"discord.commands.duration_ms",
	MetricBoundaries.linear({ start: 10, width: 50, count: 10 }),
	"Duration of Discord command execution in milliseconds",
);

export const messagesIndexed = Metric.counter("discord.messages.indexed", {
	description: "Number of messages indexed",
});

export const discordApiCalls = Metric.counter("discord.api.calls", {
	description: "Number of Discord API calls made",
});

export const discordApiErrors = Metric.counter("discord.api.errors", {
	description: "Number of Discord API errors",
});

export const autoThreadsCreated = Metric.counter(
	"discord.autothreads.created",
	{
		description: "Number of auto-threads created",
	},
);

export const solutionsMarked = Metric.counter("discord.solutions.marked", {
	description: "Number of solutions marked",
});

export const activeGuilds = Metric.gauge("discord.guilds.active", {
	description: "Number of active guilds",
});

export const eventsProcessed = Metric.counter("discord.events.processed", {
	description: "Number of Discord events processed",
});

export const syncOperations = Metric.counter("discord.sync.operations", {
	description: "Number of sync operations performed",
});

export const indexingBatchSize = Metric.histogram(
	"discord.indexing.batch_size",
	MetricBoundaries.linear({ start: 10, width: 50, count: 10 }),
	"Size of indexing batches",
);

export const indexingDuration = Metric.histogram(
	"discord.indexing.duration_ms",
	MetricBoundaries.linear({ start: 100, width: 1000, count: 10 }),
	"Duration of indexing operations in milliseconds",
);

export const githubIssuesCreated = Metric.counter(
	"discord.github_issues.created",
	{
		description: "Number of GitHub issues successfully created",
	},
);

export const githubIssuesFailed = Metric.counter(
	"discord.github_issues.failed",
	{
		description: "Number of GitHub issue creation failures",
	},
);

export const githubIssueAIExtractions = Metric.counter(
	"discord.github_issues.ai_extractions",
	{
		description: "Number of AI issue extraction attempts",
	},
);

export const githubIssueAIFallbacks = Metric.counter(
	"discord.github_issues.ai_fallbacks",
	{
		description: "Number of times AI extraction fell back to manual",
	},
);

export const githubIssueRateLimits = Metric.counter(
	"discord.github_issues.rate_limits",
	{
		description: "Number of GitHub issue rate limit hits",
	},
);

export const githubIssueAIExtractionDuration = Metric.histogram(
	"discord.github_issues.ai_extraction_duration_ms",
	MetricBoundaries.linear({ start: 100, width: 500, count: 20 }),
	"Duration of AI issue extraction in milliseconds",
);

export const githubIssueCommandDuration = Metric.histogram(
	"discord.github_issues.command_duration_ms",
	MetricBoundaries.linear({ start: 100, width: 1000, count: 20 }),
	"Duration of full GitHub issue command in milliseconds",
);
