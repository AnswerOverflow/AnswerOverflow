import { db } from '../src/db';
import { dbAttachments } from '../src/schema';
import { eq, inArray, sql } from 'drizzle-orm';
async function run() {
	// const attachments = await db
	// 	.select()
	// 	.from(dbAttachments)
	// 	.where(
	// 		sql`${dbAttachments.proxyUrl} LIKE '%answer-overflow-discord-attachments.s3.us-east-1.amazonaws.com%'`,
	// 	)
	// 	.limit(10);
	// console.log(attachments);

	await db
		.update(dbAttachments)
		.set({
			proxyUrl: sql`REPLACE(${dbAttachments.proxyUrl}, 'answer-overflow-discord-attachments.s3.us-east-1.amazonaws.com', 'cdn.answeroverflow.com')`,
		})
		.where(
			// inArray(
			// 	dbAttachments.id,
			// 	attachments.map((a) => a.id),
			// ),
			sql`${dbAttachments.proxyUrl} LIKE '%answer-overflow-discord-attachments.s3.us-east-1.amazonaws.com%'`,
		);

	// const updated = await db
	// 	.select()
	// 	.from(dbAttachments)
	// 	.where(
	// 		inArray(
	// 			dbAttachments.id,
	// 			attachments.map((a) => a.id),
	// 		),
	// 	);
	// console.log(updated.map((m) => m.proxyUrl));
}

void run();
