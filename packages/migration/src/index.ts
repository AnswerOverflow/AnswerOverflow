import { runMigration } from "./migrate";

const args = process.argv.slice(2);

if (args.includes("--validate")) {
	console.log("Validation mode not yet implemented");
	process.exit(0);
}

const testMode = args.includes("--test");

runMigration({ testMode }).catch((error) => {
	console.error("Migration failed:", error);
	process.exit(1);
});
