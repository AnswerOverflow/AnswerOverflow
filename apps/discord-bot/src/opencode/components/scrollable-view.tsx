import {
	ActionRow,
	Button,
	Container,
	Separator,
	TextDisplay,
} from "@packages/reacord";
import { useState, type ReactNode } from "react";

export interface ScrollableViewProps {
	lines: string[];
	linesPerPage?: number;
	title?: string;
	language?: string;
	accentColor?: number;
	onClose?: () => void;
	showLineNumbers?: boolean;
}

const DEFAULT_LINES_PER_PAGE = 20;
const MAX_CONTENT_LENGTH = 3500;

export function ScrollableView({
	lines,
	linesPerPage = DEFAULT_LINES_PER_PAGE,
	title,
	language,
	accentColor = 0x5865f2,
	onClose,
	showLineNumbers = false,
}: ScrollableViewProps) {
	const [offset, setOffset] = useState(0);
	const totalLines = lines.length;
	const maxOffset = Math.max(0, totalLines - linesPerPage);

	const visibleLines = lines.slice(offset, offset + linesPerPage);

	const scrollUp = () => {
		setOffset((prev) => Math.max(0, prev - Math.floor(linesPerPage / 2)));
	};

	const scrollDown = () => {
		setOffset((prev) =>
			Math.min(maxOffset, prev + Math.floor(linesPerPage / 2)),
		);
	};

	const jumpToTop = () => {
		setOffset(0);
	};

	const jumpToBottom = () => {
		setOffset(maxOffset);
	};

	const formatContent = () => {
		let content = visibleLines
			.map((line, i) => {
				if (showLineNumbers) {
					const lineNum = offset + i + 1;
					return `${lineNum.toString().padStart(4, " ")} | ${line}`;
				}
				return line;
			})
			.join("\n");

		if (content.length > MAX_CONTENT_LENGTH) {
			content = content.slice(0, MAX_CONTENT_LENGTH) + "\n... (truncated)";
		}

		if (language) {
			return `\`\`\`${language}\n${content}\n\`\`\``;
		}
		return content;
	};

	const canScrollUp = offset > 0;
	const canScrollDown = offset < maxOffset;
	const showPagination = totalLines > linesPerPage;

	const progress =
		totalLines > 0
			? Math.round(((offset + linesPerPage) / totalLines) * 100)
			: 100;
	const progressClamped = Math.min(100, progress);

	return (
		<>
			<Container accentColor={accentColor}>
				{title && <TextDisplay>**{title}**</TextDisplay>}
				{showPagination && (
					<TextDisplay>
						Lines {offset + 1}-{Math.min(offset + linesPerPage, totalLines)} of{" "}
						{totalLines} ({progressClamped}%)
					</TextDisplay>
				)}
				<Separator spacing="small" />
				<TextDisplay>{formatContent()}</TextDisplay>
			</Container>

			{showPagination && (
				<ActionRow>
					<Button
						label="Top"
						emoji="⏫"
						style="secondary"
						disabled={!canScrollUp}
						onClick={jumpToTop}
					/>
					<Button
						label="Up"
						emoji="⬆️"
						style="primary"
						disabled={!canScrollUp}
						onClick={scrollUp}
					/>
					<Button
						label="Down"
						emoji="⬇️"
						style="primary"
						disabled={!canScrollDown}
						onClick={scrollDown}
					/>
					<Button
						label="Bottom"
						emoji="⏬"
						style="secondary"
						disabled={!canScrollDown}
						onClick={jumpToBottom}
					/>
					{onClose && <Button label="Close" style="danger" onClick={onClose} />}
				</ActionRow>
			)}

			{!showPagination && onClose && (
				<ActionRow>
					<Button label="Close" style="danger" onClick={onClose} />
				</ActionRow>
			)}
		</>
	);
}

export interface ScrollableCodeProps {
	code: string;
	language?: string;
	filename?: string;
	linesPerPage?: number;
	accentColor?: number;
	onClose?: () => void;
}

export function ScrollableCode({
	code,
	language,
	filename,
	linesPerPage = DEFAULT_LINES_PER_PAGE,
	accentColor = 0x2f3136,
	onClose,
}: ScrollableCodeProps) {
	const lines = code.split("\n");
	const title = filename ?? (language ? `Code (${language})` : "Code");

	return (
		<ScrollableView
			lines={lines}
			linesPerPage={linesPerPage}
			title={title}
			language={language}
			accentColor={accentColor}
			onClose={onClose}
			showLineNumbers
		/>
	);
}

export interface ScrollableDiffProps {
	diff: string;
	filename?: string;
	additions?: number;
	deletions?: number;
	linesPerPage?: number;
	onClose?: () => void;
}

export function ScrollableDiff({
	diff,
	filename,
	additions = 0,
	deletions = 0,
	linesPerPage = DEFAULT_LINES_PER_PAGE,
	onClose,
}: ScrollableDiffProps) {
	const lines = diff.split("\n");
	const stats = [];
	if (additions > 0) stats.push(`+${additions}`);
	if (deletions > 0) stats.push(`-${deletions}`);
	const statsStr = stats.length > 0 ? ` (${stats.join(", ")})` : "";
	const title = filename ? `${filename}${statsStr}` : `Diff${statsStr}`;

	const accentColor =
		additions > deletions
			? 0x57f287
			: deletions > additions
				? 0xed4245
				: 0xfee75c;

	return (
		<ScrollableView
			lines={lines}
			linesPerPage={linesPerPage}
			title={title}
			language="diff"
			accentColor={accentColor}
			onClose={onClose}
		/>
	);
}
