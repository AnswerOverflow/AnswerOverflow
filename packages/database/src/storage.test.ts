import { Effect, Layer } from "effect";
import { describe, expect, it } from "vitest";
import { DatabaseTestLayer } from "./database-test";
import { ConvexStorageLayer, Storage } from "./storage";

describe("Storage Service", () => {
	it("should provide storage service through layer", async () => {
		const program = Effect.gen(function* () {
			const storage = yield* Storage;
			expect(storage).toBeDefined();
			expect(storage.uploadFileFromUrl).toBeDefined();
			expect(storage.uploadFile).toBeDefined();
			expect(storage.getFileUrl).toBeDefined();
			return true;
		});

		const result = await Effect.runPromise(
			program.pipe(
				Effect.provide(
					ConvexStorageLayer.pipe(Layer.provide(DatabaseTestLayer)),
				),
			),
		);

		expect(result).toBe(true);
	});

	it("should handle getFileUrl", async () => {
		const program = Effect.gen(function* () {
			const storage = yield* Storage;
			const url = yield* storage.getFileUrl({
				id: "test-id",
				filename: "test-file.png",
			});
			return url;
		});

		const result = await Effect.runPromise(
			program.pipe(
				Effect.provide(
					ConvexStorageLayer.pipe(Layer.provide(DatabaseTestLayer)),
				),
			),
		);

		expect(result).toBeNull();
	});
});
