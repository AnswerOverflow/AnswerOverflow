import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const CHECKPOINT_FILE = join(process.cwd(), ".migration-checkpoint.json");

export interface Checkpoint {
	completedTables: string[];
	currentTable: string | null;
	cursor: Record<string, string>;
	processedCount: number;
}

export function loadCheckpoint(): Checkpoint | null {
	if (!existsSync(CHECKPOINT_FILE)) {
		return null;
	}
	try {
		const data = readFileSync(CHECKPOINT_FILE, "utf8");
		return JSON.parse(data);
	} catch {
		return null;
	}
}

export function saveCheckpoint(checkpoint: Checkpoint): void {
	writeFileSync(CHECKPOINT_FILE, JSON.stringify(checkpoint, null, 2));
}

export function clearCheckpoint(): void {
	if (existsSync(CHECKPOINT_FILE)) {
		const fs = require("node:fs");
		fs.unlinkSync(CHECKPOINT_FILE);
	}
}
