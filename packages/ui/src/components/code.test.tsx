// @vitest-environment happy-dom
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { cn } from "../lib/utils";
import { InlineCode } from "./code";

describe("cn", () => {
	it("keeps theme visibility classes when they come after a display class", () => {
		expect(cn("inline-block", "dark:hidden")).toContain("dark:hidden");
		expect(cn("inline-block", "hidden dark:inline").split(" ")).toContain(
			"hidden",
		);
	});
});

describe("InlineCode", () => {
	const renderThemeSpans = (code: string, language?: string) => {
		const container = document.createElement("div");
		container.innerHTML = renderToStaticMarkup(
			<InlineCode code={code} language={language} />,
		);
		const wrapper = container.firstElementChild;
		if (!wrapper) throw new Error("InlineCode rendered no wrapper");
		return [...wrapper.children];
	};

	it("shows exactly one theme copy per mode", () => {
		for (const language of [undefined, "typescript"]) {
			const [light, dark] = renderThemeSpans("HashMap", language);
			expect(light?.classList.contains("dark:hidden")).toBe(true);
			expect(light?.classList.contains("hidden")).toBe(false);
			expect(dark?.classList.contains("hidden")).toBe(true);
			expect(dark?.classList.contains("dark:inline")).toBe(true);
			expect(light?.textContent).toBe("HashMap");
			expect(dark?.textContent).toBe("HashMap");
		}
	});
});
