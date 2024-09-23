import { db } from '../src/db';
import { dbAttachments } from '../src/schema';
import { UTApi } from 'uploadthing/server';

export const utapi = new UTApi();
const applyLastIndexed = async () => {
	const attachments = await db.query.dbAttachments.findMany({
		limit: 1000,
	});
	const filtered = attachments; // .slice(0, 10);
	let average = 0;
	let i = 0;
	for await (const attachment of filtered) {
		const start = Date.now();
		const uploaded = await utapi.uploadFilesFromUrl(attachment.url, {
			metadata: {
				messageId: attachment.messageId,
				attachmentId: attachment.id,
			},
			contentDisposition: 'inline',
		});
		if (!uploaded.error) {
			await db.update(dbAttachments).set({
				proxyUrl: uploaded.data.url,
			});
		} else {
			console.log(`Error: `, uploaded.error);
		}

		const end = Date.now();
		average += end - start;
		i++;
		console.log(
			`Uploading ${i} of ${filtered.length} in ${
				end - start
			}ms, estimated time remaining ${
				(filtered.length - i) * (average / i / 1000 / 60)
			} minutes`,
		);
	}
	process.exit(0);
};
void applyLastIndexed();
