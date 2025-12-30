import { useSmoothText, type SmoothTextOptions } from "./useSmoothText.js";

export function SmoothText({
	text,
	...options
}: { text: string } & SmoothTextOptions) {
	const [visibleText] = useSmoothText(text, options);
	return visibleText;
}
