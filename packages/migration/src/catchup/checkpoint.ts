import { existsSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { CatchupCheckpoint } from "./types";

const CHECKPOINT_FILE = join(process.cwd(), ".catchup-checkpoint.json");

export function loadCheckpoint(): CatchupCheckpoint | null {
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

export function saveCheckpoint(checkpoint: CatchupCheckpoint): void {
	writeFileSync(CHECKPOINT_FILE, JSON.stringify(checkpoint, null, 2));
}

export function clearCheckpoint(): void {
	if (existsSync(CHECKPOINT_FILE)) {
		unlinkSync(CHECKPOINT_FILE);
	}
}

export function createInitialCheckpoint(
	minSnowflake: string,
): CatchupCheckpoint {
	return {
		completedTables: [],
		currentTable: null,
		cursor: {},
		processedCount: 0,
		minSnowflake,
		startedAt: new Date().toISOString(),
	};
}
