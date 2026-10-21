import { describe, expect, it } from "vitest";
import {
	type Daemon,
	type DaemonInstance,
	isFullyStopped,
	isSingleInstanceRunning,
	liveInstances,
} from "./daemon-rollout";

const instance = (overrides: Partial<DaemonInstance>): DaemonInstance => ({
	id: "inst",
	region: "iad1",
	startedAt: "2026-10-21T00:00:00Z",
	...overrides,
});

const running = (id: string) => instance({ id, alive: true });
const stopped = (id: string) =>
	instance({ id, alive: false, stoppedAt: "2026-10-21T00:05:00Z" });

const daemon = (overrides: Partial<Daemon>): Daemon => ({
	name: "discord-bot",
	status: "ready",
	deploymentId: "dpl_new",
	scope: { type: "target", value: "production" },
	instances: { desired: 1, total: 0, ready: 0, items: [] },
	...overrides,
});

describe("isFullyStopped", () => {
	it("waits while an old instance is still draining after SIGTERM", () => {
		const draining = daemon({
			status: "reconciling",
			instances: { desired: 0, total: 1, ready: 0, items: [running("old")] },
		});
		expect(isFullyStopped([draining])).toBe(false);
	});

	it("does not treat a dead instance without stoppedAt as gone", () => {
		const unclear = daemon({
			instances: {
				desired: 0,
				total: 1,
				ready: 0,
				items: [instance({ id: "old", alive: false })],
			},
		});
		expect(isFullyStopped([unclear])).toBe(false);
	});

	it("waits while the override has not reached the daemon", () => {
		const stillDesired = daemon({
			instances: { desired: 1, total: 0, ready: 0, items: [] },
		});
		expect(isFullyStopped([stillDesired])).toBe(false);
	});

	it("checks every production deployment of the bot", () => {
		const newDeployment = daemon({
			status: "stopped",
			instances: { desired: 0, total: 0, ready: 0, items: [] },
		});
		const oldDeployment = daemon({
			deploymentId: "dpl_old",
			instances: { desired: 0, total: 1, ready: 0, items: [running("old")] },
		});
		expect(isFullyStopped([newDeployment, oldDeployment])).toBe(false);
	});

	it("passes once every instance is reported stopped", () => {
		const done = daemon({
			status: "stopped",
			instances: { desired: 0, total: 1, ready: 0, items: [stopped("old")] },
		});
		expect(isFullyStopped([done])).toBe(true);
	});

	it("ignores other daemons and non-production scopes", () => {
		const other = daemon({
			name: "worker",
			instances: { desired: 1, total: 1, ready: 1, items: [running("w")] },
		});
		const preview = daemon({
			scope: { type: "target", value: "preview" },
			instances: { desired: 1, total: 1, ready: 1, items: [running("p")] },
		});
		expect(isFullyStopped([other, preview])).toBe(true);
	});
});

describe("isSingleInstanceRunning", () => {
	it("requires exactly one live instance", () => {
		const one = daemon({
			instances: {
				desired: 1,
				total: 2,
				ready: 1,
				items: [running("new"), stopped("old")],
			},
		});
		expect(liveInstances([one]).map((i) => i.id)).toEqual(["new"]);
		expect(isSingleInstanceRunning([one])).toBe(true);
	});

	it("rejects an overlap between deployments", () => {
		const overlap = [
			daemon({
				instances: { desired: 1, total: 1, ready: 1, items: [running("new")] },
			}),
			daemon({
				deploymentId: "dpl_old",
				instances: { desired: 0, total: 1, ready: 1, items: [running("old")] },
			}),
		];
		expect(isSingleInstanceRunning(overlap)).toBe(false);
	});

	it("waits for the instance to report alive", () => {
		const starting = daemon({
			instances: {
				desired: 1,
				total: 1,
				ready: 0,
				items: [instance({ id: "new" })],
			},
		});
		expect(isSingleInstanceRunning([starting])).toBe(false);
	});
});
