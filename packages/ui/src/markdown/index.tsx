/** biome-ignore-all lint/suspicious/noExplicitAny: TODO: Fix the any */
"use client";

import React from "react";
import { parse } from "./render";

function recreateElement(element: any, key?: string | number): React.ReactNode {
	if (element === null || element === undefined) {
		return element;
	}

	if (typeof element === "string" || typeof element === "number") {
		return element;
	}

	if (Array.isArray(element)) {
		return element.map((item, index) => recreateElement(item, index));
	}

	if (
		element &&
		typeof element === "object" &&
		"$$typeof" in element &&
		"type" in element &&
		"props" in element
	) {
		const { type, props } = element;
		const { children, ...restProps } = props || {};

		let recreatedChildren: React.ReactNode = null;
		if (children !== null && children !== undefined) {
			if (Array.isArray(children)) {
				recreatedChildren = children.map((child, index) =>
					recreateElement(child, index),
				);
			} else {
				recreatedChildren = recreateElement(children);
			}
		}

		const recreatedProps: Record<string, any> = {};
		for (const [propKey, propValue] of Object.entries(restProps)) {
			if (propKey === "key" || propKey === "ref") {
				continue;
			}
			if (
				propValue &&
				typeof propValue === "object" &&
				"$$typeof" in propValue
			) {
				recreatedProps[propKey] = recreateElement(propValue);
			} else {
				recreatedProps[propKey] = propValue;
			}
		}

		return React.createElement(
			type as React.ElementType,
			{ ...recreatedProps, key },
			recreatedChildren,
		);
	}

	return element;
}

export function DiscordMarkdown({ content }: { content: string }) {
	const parsed = React.useMemo(() => {
		try {
			return parse(content);
		} catch (error) {
			console.error("Failed to parse markdown:", error);
			return content;
		}
	}, [content]);

	const recreated = React.useMemo(() => {
		return recreateElement(parsed);
	}, [parsed]);

	return <>{recreated}</>;
}
