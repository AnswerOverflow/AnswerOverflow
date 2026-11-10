import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const fixture = fileURLToPath(
	new URL("./fixtures/run-main.ts", import.meta.url),
);

const start = (...args: string[]) => {
	const child = spawn("bun", [fixture, ...args], {
		stdio: ["ignore", "pipe", "pipe"],
	});
	let output = "";
	child.stdout.on("data", (chunk) => {
		output += chunk;
	});
	child.stderr.on("data", (chunk) => {
		output += chunk;
	});
	const exited = new Promise<number | null>((resolve) =>
		child.on("exit", (code) => resolve(code)),
	);
	const ready = new Promise<void>((resolve) => {
		child.stdout.on("data", () => {
			if (output.includes("ready")) resolve();
		});
	});
	return { child, exited, ready, output: () => output };
};

describe("runMain", () => {
	it("closes the program's resources before disposing the runtime on SIGTERM", async () => {
		const bot = start();
		await bot.ready;
		bot.child.kill("SIGTERM");

		expect(await bot.exited).toBe(0);
		const output = bot.output();
		expect(output.indexOf("gateway closed")).toBeGreaterThan(-1);
		expect(output.indexOf("gateway closed")).toBeLessThan(
			output.indexOf("runtime disposed"),
		);
	}, 20_000);

	it("exits non-zero when the program fails", async () => {
		const bot = start("--fail");
		expect(await bot.exited).toBe(1);
		expect(bot.output()).toContain("Fatal error");
	}, 20_000);
});
