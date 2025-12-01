import type { Readable } from "node:stream";
import { S3Client } from "@aws-sdk/client-s3";
import { Upload } from "@aws-sdk/lib-storage";
import { Context, Effect, Layer } from "effect";
import { Database } from "./database";

export interface UploadFileFromUrlInput {
	id: string;
	filename: string;
	contentType?: string;
	url: string;
}

export interface UploadFileInput {
	filename: string;
	contentType: string;
	stream: Readable | ReadableStream | Blob;
}

export class Storage extends Context.Tag("Storage")<
	Storage,
	{
		uploadFileFromUrl: (
			input: UploadFileFromUrlInput,
		) => Effect.Effect<void, Error>;
	}
>() {}

const S3StorageServiceLive = Effect.gen(function* () {
	const bucketName = process.env.BUCKET_NAME!;
	const accessKeyId = process.env.IAM_USER_KEY!;
	const secretAccessKey = process.env.IAM_USER_SECRET!;

	const rawS3Client = new S3Client({
		credentials: {
			accessKeyId,
			secretAccessKey,
		},
		region: "us-east-1",
	});

	const uploadFileFromUrl = (input: UploadFileFromUrlInput) =>
		Effect.gen(function* () {
			const res = yield* Effect.tryPromise({
				try: () => fetch(input.url),
				catch: (error) => new Error(`Failed to fetch file from URL: ${error}`),
			});

			if (!res.ok || !res.body) {
				return null;
			}

			const key = `${input.id}/${input.filename}`;

			const bodyStream = res.body as unknown as Readable;

			yield* Effect.tryPromise({
				try: () =>
					new Upload({
						client: rawS3Client,
						params: {
							Bucket: bucketName,
							Key: key,
							Body: bodyStream,
							ContentDisposition: "inline",
							ContentType: input.contentType,
						},
					}).done(),
				catch: (error) => new Error(`Failed to upload file to S3: ${error}`),
			});
		});

	return {
		uploadFileFromUrl,
	};
});

export const S3StorageLayer = Layer.effect(Storage, S3StorageServiceLive);

const ConvexStorageServiceLive = Effect.gen(function* () {
	const database = yield* Database;

	const uploadFileFromUrl = (
		input: UploadFileFromUrlInput,
	): Effect.Effect<string | null, Error> =>
		Effect.gen(function* () {
			yield* Effect.logDebug(
				`ConvexStorage: uploading ${input.filename} to Convex`,
			);

			const storageId =
				yield* database.private.attachments.uploadAttachmentFromUrl({
					url: input.url,
					filename: input.filename,
					contentType: input.contentType,
					id: BigInt(input.id),
				});

			if (!storageId) {
				yield* Effect.logWarning(
					`Failed to upload ${input.filename} to Convex storage`,
				);
				return null;
			}

			return storageId;
		});

	return {
		uploadFileFromUrl,
	};
});

export const ConvexStorageLayer = Layer.effect(
	Storage,
	ConvexStorageServiceLive,
);
