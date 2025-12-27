import {
	ActionRow,
	Attachment,
	Button,
	Container,
	File,
	Separator,
	TextDisplay,
	useInstance,
} from "@packages/reacord";
import { useState } from "react";

const SAMPLE_LOG_CONTENT = `[2024-01-15 10:23:45] INFO: Application started
[2024-01-15 10:23:46] INFO: Connected to database
[2024-01-15 10:23:47] INFO: Loading configuration...
[2024-01-15 10:23:48] WARN: Cache directory not found, creating...
[2024-01-15 10:23:49] INFO: Server listening on port 3000
[2024-01-15 10:24:12] INFO: Request received: GET /api/health
[2024-01-15 10:24:12] INFO: Response: 200 OK
[2024-01-15 10:25:33] ERROR: Connection timeout to external service
[2024-01-15 10:25:34] WARN: Retrying connection (attempt 1/3)
[2024-01-15 10:25:36] INFO: Connection re-established
[2024-01-15 10:30:00] INFO: Scheduled job: cleanup_old_sessions started
[2024-01-15 10:30:02] INFO: Cleaned up 47 expired sessions
[2024-01-15 10:30:02] INFO: Scheduled job completed`;

const SAMPLE_CONFIG = `{
  "app": {
    "name": "AnswerOverflow Bot",
    "version": "2.0.0",
    "environment": "production"
  },
  "database": {
    "host": "localhost",
    "port": 5432,
    "name": "answer_overflow"
  },
  "discord": {
    "commandPrefix": "/",
    "maxThreadsPerChannel": 100
  },
  "features": {
    "autoIndexing": true,
    "searchEnabled": true,
    "analyticsEnabled": true
  }
}`;

type FileType = "log" | "config" | "report";

export function FileComponentScenario() {
	const instance = useInstance();
	const [selectedFile, setSelectedFile] = useState<FileType>("log");
	const [showSpoiler, setShowSpoiler] = useState(false);

	const getFileContent = () => {
		switch (selectedFile) {
			case "log":
				return {
					name: "application.log",
					content: SAMPLE_LOG_CONTENT,
				};
			case "config":
				return {
					name: "config.json",
					content: SAMPLE_CONFIG,
				};
			case "report":
				return {
					name: "daily_report.txt",
					content: generateDailyReport(),
				};
		}
	};

	const file = getFileContent();

	return (
		<>
			<Attachment
				name={file.name}
				data={Buffer.from(file.content, "utf-8")}
				spoiler={showSpoiler}
			/>

			<Container accentColor={0x57f287}>
				<TextDisplay>## File Component Demo</TextDisplay>
				<TextDisplay>
					This demo shows how to upload and display files using the
					**Attachment** and **File** components. Files are uploaded as part of
					the message and displayed inline using Components V2.
				</TextDisplay>
			</Container>

			<File url={`attachment://${file.name}`} spoiler={showSpoiler} />

			<Container accentColor={0x5865f2}>
				<TextDisplay>### Current File: `{file.name}`</TextDisplay>
				<Separator spacing="small" />
				<TextDisplay>
					**Spoiler Mode:** {showSpoiler ? "Enabled (blurred)" : "Disabled"}
				</TextDisplay>
				<TextDisplay>
					Select a different file type below, or toggle spoiler mode.
				</TextDisplay>
			</Container>

			<ActionRow>
				<Button
					label="Application Log"
					style={selectedFile === "log" ? "primary" : "secondary"}
					onClick={() => setSelectedFile("log")}
				/>
				<Button
					label="Config File"
					style={selectedFile === "config" ? "primary" : "secondary"}
					onClick={() => setSelectedFile("config")}
				/>
				<Button
					label="Daily Report"
					style={selectedFile === "report" ? "primary" : "secondary"}
					onClick={() => setSelectedFile("report")}
				/>
			</ActionRow>

			<ActionRow>
				<Button
					label={showSpoiler ? "Hide Spoiler" : "Show as Spoiler"}
					style="secondary"
					onClick={() => setShowSpoiler(!showSpoiler)}
				/>
				<Button
					label="Close"
					style="danger"
					onClick={() => instance.destroy()}
				/>
			</ActionRow>
		</>
	);
}

function generateDailyReport() {
	const now = new Date();
	const dateStr = now.toISOString().split("T")[0];
	return `=== Daily Operations Report ===
Date: ${dateStr}
Generated: ${now.toISOString()}

SUMMARY
-------
Total Messages Indexed: 15,247
New Threads Created: 89
Search Queries Processed: 3,412
Average Response Time: 142ms

TOP SERVERS BY ACTIVITY
-----------------------
1. TypeScript Community - 2,341 messages
2. React Developers - 1,892 messages
3. Node.js Help - 1,456 messages
4. Discord.js Support - 1,203 messages
5. Effect-TS - 987 messages

HEALTH STATUS
-------------
- Database: HEALTHY
- Search Index: HEALTHY
- Cache Layer: HEALTHY
- Discord Gateway: CONNECTED

NOTES
-----
- No critical incidents reported
- Scheduled maintenance completed at 03:00 UTC
- New server onboarded: "Rust Beginners"

=== End of Report ===`;
}
