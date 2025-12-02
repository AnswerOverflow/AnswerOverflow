import archiver from "archiver";
import {
	createWriteStream,
	createReadStream,
	existsSync,
	unlinkSync,
} from "fs";
import { join, dirname } from "path";
import { mkdir } from "fs/promises";
import { generatedSchemas } from "../convex-schemas";

export interface TableExport {
	tableName: string;
	documentsPath: string;
	recordCount: number;
}

export async function buildConvexZip(
	outputPath: string,
	tables: TableExport[],
): Promise<void> {
	await mkdir(dirname(outputPath), { recursive: true });

	const output = createWriteStream(outputPath);
	const archive = archiver("zip", { zlib: { level: 9 } });

	return new Promise((resolve, reject) => {
		output.on("close", () => {
			console.log(
				`\n✓ Created ${outputPath} (${(archive.pointer() / 1024 / 1024).toFixed(2)} MB)`,
			);
			resolve();
		});

		archive.on("error", reject);
		archive.pipe(output);

		for (const table of tables) {
			if (!existsSync(table.documentsPath)) {
				console.warn(
					`  Warning: ${table.documentsPath} does not exist, skipping`,
				);
				continue;
			}

			archive.append(createReadStream(table.documentsPath), {
				name: `${table.tableName}/documents.jsonl`,
			});

			const schema = generatedSchemas[table.tableName];
			if (schema && Object.keys(schema).length > 0) {
				archive.append(JSON.stringify(schema) + "\n", {
					name: `${table.tableName}/generated_schema.jsonl`,
				});
			}
		}

		archive.finalize();
	});
}

export function cleanupTempFiles(tables: TableExport[]): void {
	for (const table of tables) {
		if (existsSync(table.documentsPath)) {
			unlinkSync(table.documentsPath);
		}
	}
}
