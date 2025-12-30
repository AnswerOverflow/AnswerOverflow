import { useEffect, useRef, useState } from "react";

const FPS = 20;
const MS_PER_FRAME = 1000 / FPS;
const INITIAL_CHARS_PER_SEC = 128;

export type SmoothTextOptions = {
	/**
	 * The number of characters to display per second.
	 */
	charsPerSec?: number;
	/**
	 * Whether to initially start streaming.
	 * If this later turns to false, it'll continue streaming.
	 * This will start streaming the first value it sees.
	 */
	startStreaming?: boolean;
};
/**
 * A hook that smoothly displays text as it is streamed.
 *
 * @param text The text to display. Pass in the full text each time.
 * @param charsPerSec The number of characters to display per second.
 * @returns A tuple of the visible text and the state of the smooth text,
 * including the current cursor position and whether it's still streaming.
 * This allows you to decide if it's too far behind and you want to adjust
 * the charsPerSec or just prefer the full text.
 */
export function useSmoothText(
	text: string,
	{
		charsPerSec = INITIAL_CHARS_PER_SEC,
		startStreaming = false,
	}: SmoothTextOptions = {},
): [string, { cursor: number; isStreaming: boolean }] {
	const [visibleText, setVisibleText] = useState(
		startStreaming ? "" : text || "",
	);
	const smoothState = useRef({
		tick: Date.now(),
		cursor: visibleText.length,
		lastUpdate: Date.now(),
		lastUpdateLength: text.length,
		charsPerMs: charsPerSec / 1000,
		initial: true,
	});

	const isStreaming = smoothState.current.cursor < text.length;

	useEffect(() => {
		if (!isStreaming) {
			return;
		}
		if (smoothState.current.lastUpdateLength !== text.length) {
			const timeSinceLastUpdate = Date.now() - smoothState.current.lastUpdate;
			const latestCharsPerMs =
				(text.length - smoothState.current.lastUpdateLength) /
				timeSinceLastUpdate;
			// Is the rate increasing?
			const rateError = latestCharsPerMs - smoothState.current.charsPerMs;
			// Is our visible text falling behind what it could show?
			const charLag =
				smoothState.current.lastUpdateLength - smoothState.current.cursor;
			const lagRate = charLag / timeSinceLastUpdate;
			const charsPerMs =
				latestCharsPerMs +
				(smoothState.current.initial
					? 0
					: Math.max(0, (rateError + lagRate) / 2));
			smoothState.current.initial = false;
			// Smooth out the charsPerSec by weighting it with the previous value.
			smoothState.current.charsPerMs = Math.min(
				(2 * charsPerMs + smoothState.current.charsPerMs) / 3,
				smoothState.current.charsPerMs * 2,
			);
		}
		smoothState.current.tick = Math.max(
			smoothState.current.tick,
			Date.now() - MS_PER_FRAME,
		);
		smoothState.current.lastUpdate = Date.now();
		smoothState.current.lastUpdateLength = text.length;

		function update() {
			if (smoothState.current.cursor >= text.length) {
				return;
			}
			const now = Date.now();
			const timeSinceLastUpdate = now - smoothState.current.tick;
			const charsSinceLastUpdate = Math.floor(
				timeSinceLastUpdate * smoothState.current.charsPerMs,
			);
			const chars = Math.min(
				charsSinceLastUpdate,
				text.length - smoothState.current.cursor,
			);
			smoothState.current.cursor += chars;
			smoothState.current.tick += chars / smoothState.current.charsPerMs;
			setVisibleText(text.slice(0, smoothState.current.cursor));
		}
		update();
		const interval = setInterval(update, MS_PER_FRAME);
		return () => clearInterval(interval);
	}, [text, isStreaming, charsPerSec]);

	return [visibleText, { cursor: smoothState.current.cursor, isStreaming }];
}
