import type { StorageReader, StorageWriter } from "convex/server";
import type { GenericId } from "convex/values";
import { Effect, Option } from "effect";

export interface ConfectStorageReader {
  getUrl(
    storageId: GenericId<"_storage">,
  ): Effect.Effect<Option.Option<string>>;
}

export class ConfectStorageReaderImpl implements ConfectStorageReader {
  constructor(private storageReader: StorageReader) {}
  getUrl(
    storageId: GenericId<"_storage">,
  ): Effect.Effect<Option.Option<string>> {
    return Effect.promise(() => this.storageReader.getUrl(storageId)).pipe(
      Effect.map(Option.fromNullable),
    );
  }
}

export interface ConfectStorageWriter extends ConfectStorageReader {
  generateUploadUrl(): Effect.Effect<string>;
  delete(storageId: GenericId<"_storage">): Effect.Effect<void>;
}

export class ConfectStorageWriterImpl implements ConfectStorageWriter {
  private confectStorageReader: ConfectStorageReader;
  constructor(private storageWriter: StorageWriter) {
    this.confectStorageReader = new ConfectStorageReaderImpl(storageWriter);
  }
  getUrl(
    storageId: GenericId<"_storage">,
  ): Effect.Effect<Option.Option<string>> {
    return this.confectStorageReader.getUrl(storageId);
  }
  generateUploadUrl(): Effect.Effect<string> {
    return Effect.promise(() => this.storageWriter.generateUploadUrl());
  }
  delete(storageId: GenericId<"_storage">): Effect.Effect<void> {
    return Effect.promise(() => this.storageWriter.delete(storageId));
  }
}
