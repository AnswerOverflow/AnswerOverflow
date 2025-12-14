export class ProgressLogger {
	private tableName: string;
	private processed: number = 0;
	private total: number | null;
	private startTime: number;
	private lastLogTime: number = 0;

	constructor(tableName: string, total?: number, initialProcessed: number = 0) {
		this.tableName = tableName;
		this.total = total ?? null;
		this.processed = initialProcessed;
		this.startTime = Date.now();
	}

	increment(count: number = 1) {
		this.processed += count;
		const now = Date.now();
		if (now - this.lastLogTime > 2000 || this.processed % 10000 === 0) {
			this.log();
			this.lastLogTime = now;
		}
	}

	log() {
		const elapsed = ((Date.now() - this.startTime) / 1000).toFixed(1);
		if (this.total) {
			const pct = ((this.processed / this.total) * 100).toFixed(1);
			const rate = (
				this.processed / Math.max(parseFloat(elapsed), 0.1)
			).toFixed(0);
			process.stdout.write(
				`\r  ${this.tableName}: ${this.processed.toLocaleString()} / ${this.total.toLocaleString()} (${pct}%) - ${rate}/sec    `,
			);
		} else {
			process.stdout.write(
				`\r  ${this.tableName}: ${this.processed.toLocaleString()} rows - ${elapsed}s    `,
			);
		}
	}

	done() {
		const elapsed = ((Date.now() - this.startTime) / 1000).toFixed(1);
		console.log(
			`\r  ✓ ${this.tableName}: ${this.processed.toLocaleString()} rows in ${elapsed}s    `,
		);
	}

	getProcessed(): number {
		return this.processed;
	}
}
