import React from "react";
import { parse } from "./render";

export function DiscordMarkdown({ content }: { content: string }) {
	return <>{parse(content)}</>;
}
