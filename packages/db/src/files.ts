import * as AWS from 'aws-sdk';
import { sharedEnvs } from '@answeroverflow/env/shared';
import { Readable } from 'stream';

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
	const stream = Readable.fromWeb(res.body);
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
