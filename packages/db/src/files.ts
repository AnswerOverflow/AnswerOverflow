import * as AWS from 'aws-sdk';
import { sharedEnvs } from '@answeroverflow/env/shared';

const s3bucket = new AWS.S3({
	accessKeyId: sharedEnvs.IAM_USER_KEY as string,
	secretAccessKey: sharedEnvs.IAM_USER_SECRET as string,
});

export function uploadFile(file: {
	id: string;
	filename: string;
	contentType?: string;
	stream: NodeJS.ReadableStream;
}) {
	return s3bucket
		.upload({
			Bucket: sharedEnvs.BUCKET_NAME!,
			Key: `${file.id}/${file.filename}`,
			Body: file.stream,
			ContentDisposition: 'inline',
			ContentType: file.contentType,
		})
		.promise();
}

export async function uploadFileFromUrl(file: {
	id: string;
	filename: string;
	contentType?: string;
	url: string;
}) {
	const res = await fetch(file.url);
	if (!res.ok || !res.body) return null;
	const readable = await import('stream').then((m) => m.Readable);
	const stream = readable.fromWeb(res.body);
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
