import { Upload } from "@aws-sdk/lib-storage";
import { S3, PutObjectCommandInput } from "@aws-sdk/client-s3";
import { Readable } from "stream";
import { ReadableStream } from "stream/web";

const s3bucket = new S3({
  credentials: {
    accessKeyId: process.env.IAM_USER_KEY as string,
    secretAccessKey: process.env.IAM_USER_SECRET as string,
  },
  region: "us-east-1",
});

export async function uploadFileFromUrl(file: {
  id: string;
  filename: string;
  contentType?: string;
  url: string;
}) {
  if (process.env.NODE_ENV === "test") return null;
  const res = await fetch(file.url);
  if (!res.ok || !res.body) return null;
  const stream = Readable.fromWeb(
    res.body as unknown as ReadableStream<Uint8Array>
  );
  return new Upload({
    client: s3bucket,
    params: {
      Bucket: process.env.BUCKET_NAME as string,

      Key: `${file.id}/${file.filename}`,
      Body: stream,
      ContentDisposition: "inline",
      ContentType: file.contentType,
    },
  }).done();
}

export async function uploadFile(file: {
  filename: string;
  contentType: string;
  stream: PutObjectCommandInput["Body"];
}) {
  if (process.env.NODE_ENV === "test") return null;
  return new Upload({
    client: s3bucket,

    params: {
      Bucket: process.env.BUCKET_NAME as string,
      Key: `${file.filename}`,
      Body: file.stream,
      ContentDisposition: "inline",
      ContentType: file.contentType,
    },
  }).done();
}
