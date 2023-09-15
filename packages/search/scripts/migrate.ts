import fs from 'fs';
import * as readline from 'readline';
import { ElasticMessage, zMessage } from '../src/schema';
import { upsertManyMessages } from '@answeroverflow/db';

// Create a readable stream for your file
const fileStream = fs.createReadStream(
	'D:\\Elastic\\es-exported-index-v2.json',
);

// Create a readline interface
const rl = readline.createInterface({
	input: fileStream,
	crlfDelay: Infinity, // To handle both \r\n and \n line endings
});

// Set up an event listener to process each line
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const total = 3641817;
let read = 0;
const offset = 0;
const cutoff = 10000;
const toUpload: ElasticMessage[] = [];
rl.on('line', (line) => {
	read++;
	if (read < offset) {
		return;
	}
	const json = JSON.parse(line);
	// @ts-ignore
	const parsed = zMessage.parse(json._source);
	toUpload.push(parsed);
	console.log(
		`Read ${read} lines, ${cutoff} cutoff, ${toUpload.length} to upload`,
	);
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
	await upsertManyMessages(
		toUpload.map((m) => {
			return {
				reactions: [],
				embeds: [],
				questionId: null,
				referenceId: null,
				attachments: [],

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
		}),
	);
	console.log(
		`Successfully uploaded ${toUpload.length} messages to planetscale`,
	);
	// eslint-disable-next-line n/no-process-exit
	process.exit(0);
});
