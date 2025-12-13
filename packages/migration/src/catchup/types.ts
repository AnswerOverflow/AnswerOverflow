import type { Effect } from "effect";

export interface CatchupOptions {
	daysAgo: number;
	dryRun: boolean;
	fresh: boolean;
	table?: string;
}

export interface CatchupCheckpoint {
	completedTables: string[];
	currentTable: string | null;
	cursor: Record<string, string>;
	processedCount: number;
	minSnowflake: string;
	startedAt: string;
}

export interface SyncResult {
	synced: number;
	failed: number;
	skipped: number;
}

export interface SyncContext {
	minSnowflake: string;
	options: CatchupOptions;
	onProgress: (cursor: string, count: number) => void;
}

export type DatabaseService = Effect.Effect.Success<
	typeof import("@packages/database/database").service
>;
