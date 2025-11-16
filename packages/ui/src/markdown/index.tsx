/** biome-ignore-all lint/suspicious/noExplicitAny: TODO: Fix the any */
"use client";

import React from "react";
import { parse } from "./render";

/**
 * Recreates React elements using the current React instance
 * This fixes compatibility issues with simple-markdown creating elements
 * using an older React API
 */

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

	// But we'll recreate it anyway to ensure it uses the current React instance
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

		// Recreate all props recursively to ensure no old React elements remain
		const recreatedProps: Record<string, any> = {};
		for (const [propKey, propValue] of Object.entries(restProps)) {
			// Skip special React props
			if (propKey === "key" || propKey === "ref") {
				continue;
			}
			// Recursively recreate prop values that might be React elements
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

		// Use React.createElement to ensure we're using the current React instance
		return React.createElement(
			type as React.ElementType,
			{ ...recreatedProps, key },
			recreatedChildren,
		);
	}

	// If it's not a React element, return as-is
	return element;
}

export function DiscordMarkdown({ content }: { content: string }) {
	// Parse the markdown content
	const parsed = React.useMemo(() => {
		try {
			return parse(content);
		} catch (error) {
			console.error("Failed to parse markdown:", error);
			return content;
		}
	}, [content]);

	// Recreate elements using the current React instance
	const recreated = React.useMemo(() => {
		return recreateElement(parsed);
	}, [parsed]);

	return <>{recreated}</>;
}
