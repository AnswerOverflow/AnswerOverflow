#!/usr/bin/env bun
// Stop-first rollout for the discord-bot Vercel daemon, so two bots never hold
// the Discord gateway at once. See DEPLOY.md.
//
//   VERCEL_TOKEN=... bun scripts/daemon-rollout.ts stop    # override to 0, wait until no instance runs
//   VERCEL_TOKEN=... bun scripts/daemon-rollout.ts start   # clear override, wait for exactly one instance
//   VERCEL_TOKEN=... bun scripts/daemon-rollout.ts status

const API = "https://api.vercel.com";
const PROJECT = "answer-overflow-discord-bot";
const TEAM_SLUG = "answer-overflow";
const DAEMON = "discord-bot";
const REGION = "iad1";
const POLL_MS = 5_000;
const TIMEOUT_MS = 5 * 60_000;

export interface DaemonInstance {
	id: string;
	region: string;
	startedAt: string;
	alive?: boolean;
	stoppedAt?: string;
}

export interface Daemon {
	name: string;
	status: "ready" | "reconciling" | "stopped";
	deploymentId?: string;
	scope: { type: string; value: string };
	instances: {
		desired: number;
		total: number;
		ready: number;
		items: DaemonInstance[];
	};
}

/** Production entries for the bot daemon. */
export const botDaemons = (daemons: readonly Daemon[]) =>
	daemons.filter(
		(daemon) =>
			daemon.name === DAEMON &&
			daemon.scope.type === "target" &&
			daemon.scope.value === "production",
	);

/** An instance counts as gone only once Vercel reports it dead and stopped. */
const isGone = (instance: DaemonInstance) =>
	instance.alive === false && instance.stoppedAt !== undefined;

/** True when nothing should start and no instance of any deployment is running. */
export const isFullyStopped = (daemons: readonly Daemon[]) =>
	botDaemons(daemons).every(
		(daemon) =>
			daemon.instances.desired === 0 && daemon.instances.items.every(isGone),
	);

/** The instances that may still be connected to Discord. */
export const liveInstances = (daemons: readonly Daemon[]) =>
	botDaemons(daemons).flatMap((daemon) =>
		daemon.instances.items.filter((instance) => !isGone(instance)),
	);

/** True when exactly one instance runs and it is alive. */
export const isSingleInstanceRunning = (daemons: readonly Daemon[]) => {
	const live = liveInstances(daemons);
	return live.length === 1 && live[0]?.alive === true;
};

const request = async (method: string, path: string, body?: unknown) => {
	const token = process.env.VERCEL_TOKEN;
	if (!token) throw new Error("VERCEL_TOKEN is not set");
	const url = new URL(path, API);
	url.searchParams.set("slug", TEAM_SLUG);
	const response = await fetch(url, {
		method,
		headers: {
			Authorization: `Bearer ${token}`,
			"Content-Type": "application/json",
		},
		body: body === undefined ? undefined : JSON.stringify(body),
	});
	if (!response.ok) {
		throw new Error(
			`${method} ${url.pathname} failed: ${String(response.status)} ${await response.text()}`,
		);
	}
	return response.json();
};

const listDaemons = async (): Promise<Daemon[]> => {
	const body = (await request(
		"GET",
		`/v1/projects/${PROJECT}/daemons?limit=100`,
	)) as { daemons: Daemon[] };
	return body.daemons;
};

const setOverride = (counts: Record<string, number>) =>
	request(
		"PUT",
		`/v1/projects/${PROJECT}/daemons/${DAEMON}/instances?target=production`,
		counts,
	);

const describe = (daemons: readonly Daemon[]) =>
	botDaemons(daemons)
		.map(
			(daemon) =>
				`${daemon.status} deployment=${daemon.deploymentId ?? "-"} desired=${String(daemon.instances.desired)} live=${daemon.instances.items
					.filter((instance) => !isGone(instance))
					.map((instance) => instance.id)
					.join(",")}`,
		)
		.join("\n") || "no production discord-bot daemon";

const waitFor = async (
	label: string,
	done: (daemons: readonly Daemon[]) => boolean,
) => {
	const deadline = Date.now() + TIMEOUT_MS;
	while (true) {
		const daemons = await listDaemons();
		console.log(describe(daemons));
		if (done(daemons)) return;
		if (Date.now() > deadline) throw new Error(`Timed out waiting: ${label}`);
		await Bun.sleep(POLL_MS);
	}
};

const main = async (command: string | undefined) => {
	switch (command) {
		case "stop":
			await setOverride({ [REGION]: 0 });
			await waitFor("no live instance", isFullyStopped);
			console.log("Stopped. Safe to deploy, promote, or roll back.");
			return;
		case "start":
			await setOverride({});
			await waitFor("exactly one live instance", isSingleInstanceRunning);
			console.log("Running one instance.");
			return;
		case "status":
			console.log(describe(await listDaemons()));
			return;
		default:
			throw new Error("usage: daemon-rollout.ts stop|start|status");
	}
};

if (import.meta.main) {
	main(process.argv[2]).catch((error: unknown) => {
		console.error(error instanceof Error ? error.message : error);
		process.exit(1);
	});
}
