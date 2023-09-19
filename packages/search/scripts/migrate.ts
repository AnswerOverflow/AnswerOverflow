import fs from 'fs';
import * as readline from 'readline';
import { ElasticMessage, zMessage } from '../src/schema';
import {
	BaseMessageWithRelations,
	fastUpsertManyMessages,
} from '@answeroverflow/db';

// Create a readable stream for your file
const fileStream = fs.createReadStream(
	'D:\\Elastic\\es-exported-index-v2.json',
);

// Create a readline interface
const rl = readline.createInterface({
	input: fileStream,
	crlfDelay: Infinity, // To handle both \r\n and \n line endings
});

function convertToPsMessage(
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	m: ElasticMessage,
): BaseMessageWithRelations {
	const reactions: BaseMessageWithRelations['reactions'] = [];
	m.reactions.forEach((r) => {
		const eName = r.emojiName;
		const eId = r.emojiId;
		if (!eName || !eId) return;
		r.reactorIds.forEach((id) => {
			reactions.push({
				userId: id,
				emojiId: eId,
				messageId: m.id,
				emoji: {
					name: eName,
					id: eId,
				},
			});
		});
	});
	const attachments: BaseMessageWithRelations['attachments'] = [];
	m.attachments.forEach((a) => {
		attachments.push({
			id: a.id,
			messageId: m.id,
			width: a.width ?? 0,
			url: a.url,
			size: a.size,
			height: a.height ?? 0,
			proxyUrl: a.proxyUrl,
			contentType: a.contentType ?? 'unknown',
			filename: a.filename,
			description: a.description ?? '',
		});
	});

	const embeds: BaseMessageWithRelations['embeds'] = [];
	m.embeds.forEach((e) => {
		embeds.push({
			author: e.author,
			url: e.url,
			type: e.type,
			description: e.description,
			color: e.color,
			fields: e.fields,
			footer: e.footer,
			image: e.image,
			provider: e.provider,
			thumbnail: e.thumbnail,
			timestamp: e.timestamp,
			video: e.video,
			title: e.title,
		});
	});

	return {
		reactions,
		embeds,
		questionId: null,
		referenceId: m.messageReference?.messageId ?? null,
		attachments,

		pinned: m.pinned,
		interactionId: m.interactionId,
		content: m.content,
		webhookId: m.webhookId,
		childThreadId: m.childThreadId,
		applicationId: m.applicationId,
		flags: m.flags,
		id: m.id,
		parentChannelId: m.parentChannelId,
		authorId: m.authorId,
		channelId: m.channelId,
		tts: m.tts,
		type: m.type,
		nonce: m.nonce,
		serverId: m.serverId,
	};
}

// Set up an event listener to process each line
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const total = 3641817;
let read = 0;
const offset = 3400000;
const cutoff = 2000000;
const toUpload: BaseMessageWithRelations[] = [];
rl.on('line', (line) => {
	read++;
	if (read < offset) {
		return;
	}
	const json = JSON.parse(line);
	// @ts-ignore
	const parsed = zMessage.parse(json._source);
	toUpload.push(convertToPsMessage(parsed));
	if (read % 10000 === 0) {
		console.log(
			`Read ${read} lines, ${cutoff} cutoff, ${toUpload.length} to upload`,
		);
	}
	if (toUpload.length >= cutoff) {
		rl.close();
	}
});

// Listen for the 'close' event to know when the stream has ended
// eslint-disable-next-line @typescript-eslint/no-misused-promises
rl.on('close', async () => {
	console.log('File reading completed.');
	console.log(`Parsed ${read} lines.`);
	console.log(`Uploading ${toUpload.length} messages to planetscale`);
	// eslint-disable-next-line n/no-process-exit
	const chunkSize = 5000;
	let uploaded = 0;
	const chunks = [];
	for (let i = 0; i < toUpload.length; i += chunkSize) {
		chunks.push(toUpload.slice(i, i + chunkSize));
	}
	// do 6 chunks at a time
	const subChunks = [];
	for (let i = 0; i < chunks.length; i += 3) {
		subChunks.push(chunks.slice(i, i + 3));
	}
	for await (const subChunk of subChunks) {
		await Promise.all(
			subChunk.map(async (chunk) => {
				await fastUpsertManyMessages(chunk);
				uploaded += chunk.length;
				console.log(`Uploaded chunk ${uploaded}/${toUpload.length}`);
			}),
		);
	}

	// for await (const chunk of chunks) {
	// 	await fastUpsertManyMessages(chunk);
	// 	uploaded += chunk.length;
	// 	console.log(`Uploaded chunk ${uploaded}/${toUpload.length}`);
	// }
	console.log(
		`Successfully uploaded ${toUpload.length} messages to planetscale`,
	);
	// eslint-disable-next-line n/no-process-exit
	process.exit(0);
});
