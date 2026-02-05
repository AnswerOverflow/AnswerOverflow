import { Config, Effect, Layer, Option } from "effect";
import { sendAlert } from "./src/core/alerting";
import { Pushover } from "./src/core/pushover-service";

const AlertingLayer = Pushover.Default;

const runTests = Effect.gen(function* () {
	const environment = yield* Config.string("RAILWAY_ENVIRONMENT").pipe(
		Config.option,
	);

	const startTime = Date.now();

	const proc = Bun.spawn(["bun", "x", "vitest", "run", "--no-watch"], {
		cwd: import.meta.dir,
		stdout: "inherit",
		stderr: "inherit",
		env: {
			...process.env,
		},
	});

	const exitCode = yield* Effect.promise(() => proc.exited);
	const duration = Date.now() - startTime;

	if (exitCode !== 0) {
		console.error(`\n❌ Tests failed with exit code ${exitCode}`);

		yield* sendAlert({
			testName: "Bot E2E Suite",
			error: `Tests exited with code ${exitCode} after ${duration}ms`,
			timestamp: new Date().toISOString(),
			environment: Option.getOrElse(environment, () => "local"),
		}).pipe(
			Effect.catchAll((e) => {
				console.error("Failed to send alert:", e);
				return Effect.void;
			}),
		);

		process.exit(exitCode);
	}

	console.log(`\n✅ All tests passed in ${duration}ms`);
});

Effect.runPromise(runTests.pipe(Effect.provide(AlertingLayer))).catch((err) => {
	console.error("Fatal error:", err);
	process.exit(1);
});
