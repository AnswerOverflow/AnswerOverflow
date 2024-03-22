import * as AWS from 'aws-sdk';
import { sharedEnvs } from '@answeroverflow/env/shared';
import { Readable } from 'stream';
import { ReadableStream } from 'stream/web';

const s3bucket = new AWS.S3({
	accessKeyId: sharedEnvs.IAM_USER_KEY as string,
	secretAccessKey: sharedEnvs.IAM_USER_SECRET as string,
});

export async function uploadFileFromUrl(file: {
	id: string;
	filename: string;
	contentType?: string;
	url: string;
}) {
	if (sharedEnvs.NODE_ENV === 'test') return null;
	const res = await fetch(file.url);
	if (!res.ok || !res.body) return null;
	const stream = Readable.fromWeb(res.body as ReadableStream<Uint8Array>);
	return s3bucket
		.upload({
			Bucket: sharedEnvs.BUCKET_NAME as string,
			Key: `${file.id}/${file.filename}`,
			Body: stream,
			ContentDisposition: 'inline',
			ContentType: file.contentType,
		})
		.promise();
}

export async function uploadFile(file: {
	filename: string;
	contentType: string;
	stream: AWS.S3.Body;
}) {
	if (sharedEnvs.NODE_ENV === 'test') return null;
	return s3bucket
		.upload({
			Bucket: sharedEnvs.BUCKET_NAME as string,
			Key: `${file.filename}`,
			Body: file.stream,
			ContentDisposition: 'inline',
			ContentType: file.contentType,
		})
		.promise();
}
