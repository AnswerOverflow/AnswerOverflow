import { createWriteStream, type WriteStream } from "node:fs";

function stripUndefined(obj: object): Record<string, unknown> {
	const result: Record<string, unknown> = {};
	for (const [key, value] of Object.entries(obj)) {
		if (value !== undefined) {
			result[key] = value;
		}
	}
	return result;
}

export class JsonlWriter {
	private stream: WriteStream;
	private count: number = 0;

	constructor(
		filePath: string,
		options: { append?: boolean; initialCount?: number } = {},
	) {
		this.stream = createWriteStream(filePath, {
			encoding: "utf8",
			flags: options.append ? "a" : "w",
		});
		this.count = options.initialCount ?? 0;
	}

	write(record: object) {
		const cleaned = stripUndefined(record);
		this.stream.write(`${JSON.stringify(cleaned)}\n`);
		this.count++;
	}

	async close(): Promise<number> {
		return new Promise((resolve, reject) => {
			this.stream.end(() => {
				resolve(this.count);
			});
			this.stream.on("error", reject);
		});
	}

	getCount(): number {
		return this.count;
	}
}
