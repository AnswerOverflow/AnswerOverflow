import { spawn } from "node:child_process";
import { join } from "node:path";

const TEMP_DIR = join(process.cwd(), ".migration-temp");

const file = process.argv[2];
const fields = process.argv.slice(3);

if (!file || fields.length === 0) {
	console.log(
		"Usage: bun run src/convert-single.ts <file> <field1> [field2] ...",
	);
	console.log(
		"Example: bun run src/convert-single.ts messages.jsonl id authorId serverId channelId",
	);
	process.exit(1);
}

const inputPath = join(TEMP_DIR, file);
const outputPath = join(TEMP_DIR, `${file}.new`);

const sedExpr = fields
	.map((f) => `s/"${f}":"([0-9]+)"/"${f}":{"\$integer":"\\1"}/g`)
	.join("; ");

console.log(`Converting ${file}...`);
console.log(`Fields: ${fields.join(", ")}`);

const sed = spawn("sed", ["-E", sedExpr, inputPath], {
	stdio: ["inherit", "pipe", "inherit"],
});
const output = require("node:fs").createWriteStream(outputPath);

sed.stdout.pipe(output);

sed.on("close", (code) => {
	if (code === 0) {
		require("node:fs").unlinkSync(inputPath);
		require("node:fs").renameSync(outputPath, inputPath);
		console.log(`✓ ${file} converted`);
	} else {
		console.error(`Failed with code ${code}`);
		process.exit(1);
	}
});
