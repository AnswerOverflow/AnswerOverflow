import { sendAlert } from "./src/alerting";

const startTime = Date.now();

const proc = Bun.spawn(["bun", "test"], {
	cwd: import.meta.dir,
	stdout: "inherit",
	stderr: "inherit",
	env: {
		...process.env,
	},
});

const exitCode = await proc.exited;
const duration = Date.now() - startTime;

if (exitCode !== 0) {
	console.error(`\n❌ Tests failed with exit code ${exitCode}`);

	await sendAlert({
		testName: "Bot E2E Suite",
		error: `Tests exited with code ${exitCode} after ${duration}ms`,
		timestamp: new Date().toISOString(),
		environment: process.env.RAILWAY_ENVIRONMENT || "local",
	});

	process.exit(exitCode);
}

console.log(`\n✅ All tests passed in ${duration}ms`);
