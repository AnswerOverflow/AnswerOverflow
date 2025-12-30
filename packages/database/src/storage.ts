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

export type EmbedImageField =
	| "image"
	| "thumbnail"
	| "video"
	| "footerIcon"
	| "authorIcon";

export interface UploadEmbedImageInput {
	url: string;
	messageId: bigint;
	embedIndex: number;
	field: EmbedImageField;
}

export interface UploadSitemapInput {
	filename: string;
	content: string;
}

export class Storage extends Context.Tag("Storage")<
	Storage,
	{
		uploadFileFromUrl: (
			input: UploadFileFromUrlInput,
		) => Effect.Effect<void, Error>;
		uploadEmbedImage: (
			input: UploadEmbedImageInput,
		) => Effect.Effect<void, Error>;
		uploadSitemap: (input: UploadSitemapInput) => Effect.Effect<void, Error>;
	}
>() {}

const S3StorageServiceLive = Effect.gen(function* () {
	const database = yield* Database;
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

	const uploadEmbedImage = (input: UploadEmbedImageInput) =>
		Effect.gen(function* () {
			yield* Effect.logDebug(
				`S3Storage: uploading embed ${input.field} for message ${input.messageId}`,
			);

			const res = yield* Effect.tryPromise({
				try: () => fetch(input.url),
				catch: (error) =>
					new Error(`Failed to fetch embed image from URL: ${error}`),
			});

			if (!res.ok || !res.body) {
				yield* Effect.logWarning(
					`Failed to fetch embed image from URL: ${input.url}`,
				);
				return;
			}

			const contentType = res.headers.get("content-type") ?? "image/png";
			const extension = contentType.split("/")[1] ?? "png";
			const key = `embeds/${input.messageId}/${input.embedIndex}/${input.field}.${extension}`;

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
							ContentType: contentType,
						},
					}).done(),
				catch: (error) =>
					new Error(`Failed to upload embed image to S3: ${error}`),
			});

			yield* database.private.messages.updateEmbedS3Key({
				messageId: input.messageId,
				embedIndex: input.embedIndex,
				field: input.field,
				s3Key: key,
			});

			yield* Effect.logDebug(
				`S3Storage: successfully uploaded embed ${input.field} for message ${input.messageId} with key ${key}`,
			);
		});

	const uploadSitemap = (input: UploadSitemapInput) =>
		Effect.gen(function* () {
			yield* Effect.tryPromise({
				try: () =>
					new Upload({
						client: rawS3Client,
						params: {
							Bucket: bucketName,
							Key: `sitemaps/${input.filename}`,
							Body: input.content,
							ContentType: "text/xml",
						},
					}).done(),
				catch: (error) => new Error(`Failed to upload sitemap to S3: ${error}`),
			});
		}).pipe(
			Effect.withSpan("storage.upload_sitemap", {
				attributes: { filename: input.filename },
			}),
		);

	return {
		uploadFileFromUrl,
		uploadEmbedImage,
		uploadSitemap,
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

	const uploadEmbedImage = (
		input: UploadEmbedImageInput,
	): Effect.Effect<void, Error> =>
		Effect.gen(function* () {
			yield* Effect.logDebug(
				`ConvexStorage: uploading embed ${input.field} for message ${input.messageId}`,
			);

			yield* database.private.attachments.uploadEmbedImageFromUrl({
				url: input.url,
				messageId: input.messageId,
				embedIndex: input.embedIndex,
				field: input.field,
			});
		});

	const uploadSitemap = (_input: UploadSitemapInput) =>
		Effect.gen(function* () {
			yield* Effect.logWarning(
				"ConvexStorage: uploadSitemap not supported, use S3Storage",
			);
		});

	return {
		uploadFileFromUrl,
		uploadEmbedImage,
		uploadSitemap,
	};
});

export const ConvexStorageLayer = Layer.effect(
	Storage,
	ConvexStorageServiceLive,
);
