import Database from "bun:sqlite";

const DISCORD_INVITE_REGEX =
	/(?:discord\.gg|discord(?:app)?\.com\/invite)\/([a-zA-Z0-9-]+)/gi;

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
if (!GITHUB_TOKEN) {
	console.error("GITHUB_TOKEN environment variable is required");
	process.exit(1);
}

const db = new Database("./scripts/community-servers.db");

type GitHubRepo = {
	full_name: string;
	stargazers_count: number;
	description: string | null;
};

type GitHubSearchResponse = {
	total_count: number;
	incomplete_results: boolean;
	items: Array<GitHubRepo>;
};

type DiscordInviteApiResponse = {
	code?: string;
	guild?: {
		id: string;
		name: string;
		icon: string | null;
	};
	approximate_member_count?: number;
};

type ValidatedInvite = {
	code: string;
	guildId: string;
	guildName: string;
	guildIcon: string | null;
	memberCount: number | null;
};

const existingServerIds = new Set(
	db
		.query<{ id: string }, []>("SELECT id FROM community_servers")
		.all()
		.map((r) => r.id),
);

console.log(`Loaded ${existingServerIds.size} existing servers`);

const insertServer = db.prepare(
	"INSERT OR IGNORE INTO community_servers (id, name, icon, member_count, invite, description) VALUES (?, ?, ?, ?, ?, ?)",
);

let searchRateLimitRemaining = 30;
let searchRateLimitReset = Date.now();

async function fetchTopRepos(
	starRange: string,
	page: number,
): Promise<Array<GitHubRepo>> {
	if (searchRateLimitRemaining <= 1 && Date.now() < searchRateLimitReset) {
		const waitTime = searchRateLimitReset - Date.now() + 1000;
		console.log(
			`  Search rate limit, waiting ${Math.ceil(waitTime / 1000)}s...`,
		);
		await Bun.sleep(waitTime);
	}

	const perPage = 100;
	const url = `https://api.github.com/search/repositories?q=stars:${starRange}&sort=stars&order=desc&per_page=${perPage}&page=${page}`;

	const response = await fetch(url, {
		headers: {
			Authorization: `Bearer ${GITHUB_TOKEN}`,
			Accept: "application/vnd.github+json",
			"X-GitHub-Api-Version": "2022-11-28",
		},
	});

	searchRateLimitRemaining = parseInt(
		response.headers.get("x-ratelimit-remaining") ?? "30",
		10,
	);
	searchRateLimitReset =
		parseInt(response.headers.get("x-ratelimit-reset") ?? "0", 10) * 1000;

	if (!response.ok) {
		if (response.status === 403 || response.status === 429) {
			console.log(`  Search rate limited, waiting 60s...`);
			await Bun.sleep(60000);
			return fetchTopRepos(starRange, page);
		}
		if (response.status === 422) {
			return [];
		}
		if (response.status >= 500) {
			console.log(`  GitHub error ${response.status}, retrying in 5s...`);
			await Bun.sleep(5000);
			return fetchTopRepos(starRange, page);
		}
		console.error(`GitHub search failed: ${response.status}`);
		return [];
	}

	const data = (await response.json()) as GitHubSearchResponse;
	return data.items;
}

async function fetchReadme(
	owner: string,
	repo: string,
): Promise<string | null> {
	const readmeVariants = ["README.md", "readme.md", "Readme.md", "README.MD"];

	for (const filename of readmeVariants) {
		const url = `https://raw.githubusercontent.com/${owner}/${repo}/HEAD/${filename}`;
		try {
			const response = await fetch(url);
			if (response.ok) {
				return response.text();
			}
		} catch {}
	}

	return null;
}

async function validateInvite(
	inviteCode: string,
): Promise<ValidatedInvite | null> {
	try {
		const response = await fetch(
			`https://discord.com/api/v10/invites/${inviteCode}?with_counts=true`,
		);
		if (!response.ok) return null;

		const data = (await response.json()) as DiscordInviteApiResponse;
		if (!data.guild?.id) return null;

		return {
			code: inviteCode,
			guildId: data.guild.id,
			guildName: data.guild.name,
			guildIcon: data.guild.icon
				? `https://cdn.discordapp.com/icons/${data.guild.id}/${data.guild.icon}.png?size=256`
				: null,
			memberCount: data.approximate_member_count ?? null,
		};
	} catch {
		return null;
	}
}

function extractDiscordInviteCodes(text: string): Array<string> {
	const matches = text.matchAll(DISCORD_INVITE_REGEX);
	const codes = new Set<string>();
	for (const match of matches) {
		if (match[1]) codes.add(match[1]);
	}
	return [...codes];
}

async function processRepo(repo: GitHubRepo): Promise<{
	invite: ValidatedInvite;
	repoName: string;
	description: string | null;
} | null> {
	const [owner, repoName] = repo.full_name.split("/");
	if (!owner || !repoName) return null;

	const readme = await fetchReadme(owner, repoName);
	if (!readme) return null;

	const inviteCodes = extractDiscordInviteCodes(readme);
	if (inviteCodes.length === 0) return null;

	for (const code of inviteCodes.slice(0, 5)) {
		const invite = await validateInvite(code);
		if (invite && !existingServerIds.has(invite.guildId)) {
			return {
				invite,
				repoName: repo.full_name,
				description: repo.description,
			};
		}
	}

	return null;
}

async function main() {
	let newServersFound = 0;
	let reposProcessed = 0;

	const starRanges = [
		">100000",
		"50000..100000",
		"25000..50000",
		"15000..25000",
		"10000..15000",
		"7500..10000",
		"5000..7500",
		"3500..5000",
		"2500..3500",
		"2000..2500",
	];

	console.log(
		`Fetching top GitHub repos by stars (${starRanges.length} ranges)...\n`,
	);

	for (const starRange of starRanges) {
		console.log(`\n=== Stars: ${starRange} ===`);

		for (let page = 1; page <= 10; page++) {
			process.stdout.write(`  Page ${page}/10... `);
			const repos = await fetchTopRepos(starRange, page);

			if (repos.length === 0) {
				console.log("done");
				break;
			}

			let pageNewServers = 0;

			for (const repo of repos) {
				reposProcessed++;

				const result = await processRepo(repo);

				if (result) {
					insertServer.run(
						result.invite.guildId,
						result.invite.guildName,
						result.invite.guildIcon,
						result.invite.memberCount,
						`https://discord.gg/${result.invite.code}`,
						result.description,
					);

					existingServerIds.add(result.invite.guildId);
					newServersFound++;
					pageNewServers++;
					console.log(
						`\n    + ${result.invite.guildName} (${result.repoName})`,
					);
					process.stdout.write(`  Page ${page}/10... `);
				}
			}

			console.log(`${pageNewServers} new (${newServersFound} total)`);
			await Bun.sleep(1000);
		}
	}

	console.log(`\n=== Summary ===`);
	console.log(`Repos processed: ${reposProcessed}`);
	console.log(`New servers found: ${newServersFound}`);
	console.log(`Total servers in DB: ${existingServerIds.size}`);
}

main().catch(console.error);
