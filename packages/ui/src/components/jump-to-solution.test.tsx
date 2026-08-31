// @vitest-environment happy-dom
import { act, type ReactNode, useEffect } from "react";
import { createRoot } from "react-dom/client";
import { beforeEach, describe, expect, it } from "vitest";
import { JumpToSolution } from "./jump-to-solution";
import {
	MessageResultPageProvider,
	type MessageScroller,
	useMessageResultPageContext,
} from "./message-result-page-context";

// React needs this to run effects synchronously inside act().
(
	globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

const SOLUTION_ID = "1462183916965466295";

/**
 * Stands in for the virtualized replies list: it registers a scroller the same
 * way `SnapshotInfiniteList` does, and records what it was asked to scroll to.
 */
function FakeRepliesList(props: { scroller: MessageScroller }) {
	const { registerMessageScroller } = useMessageResultPageContext();
	const scroller = props.scroller;
	useEffect(
		() => registerMessageScroller(scroller),
		[registerMessageScroller, scroller],
	);
	return null;
}

function render(ui: ReactNode) {
	const container = document.createElement("div");
	document.body.appendChild(container);
	const root = createRoot(container);
	act(() => {
		root.render(ui);
	});
	return container;
}

function click(element: Element) {
	act(() => {
		element.dispatchEvent(
			new MouseEvent("click", { bubbles: true, cancelable: true }),
		);
	});
}

beforeEach(() => {
	document.body.innerHTML = "";
	window.location.hash = "";
});

describe("JumpToSolution", () => {
	it("asks the replies list to scroll to the solution", () => {
		const scrolledTo: Array<string> = [];
		const container = render(
			<MessageResultPageProvider>
				<JumpToSolution id={SOLUTION_ID} />
				<FakeRepliesList
					scroller={(id) => {
						scrolledTo.push(id);
						return true;
					}}
				/>
			</MessageResultPageProvider>,
		);

		const link = container.querySelector("a");
		expect(link?.getAttribute("href")).toBe(`#solution-${SOLUTION_ID}`);
		click(link as Element);

		expect(scrolledTo).toEqual([SOLUTION_ID]);
	});

	it("leaves the anchor alone when nothing can scroll to the solution", () => {
		const container = render(
			<MessageResultPageProvider>
				<JumpToSolution id={SOLUTION_ID} />
			</MessageResultPageProvider>,
		);

		const link = container.querySelector("a") as Element;
		const event = new MouseEvent("click", {
			bubbles: true,
			cancelable: true,
		});
		act(() => {
			link.dispatchEvent(event);
		});

		expect(event.defaultPrevented).toBe(false);
	});
});

describe("MessageResultPageProvider", () => {
	it("resolves a #solution- deep link once the list has mounted", () => {
		window.location.hash = `#solution-${SOLUTION_ID}`;
		const scrolledTo: Array<string> = [];

		render(
			<MessageResultPageProvider>
				<FakeRepliesList
					scroller={(id) => {
						scrolledTo.push(id);
						return true;
					}}
				/>
			</MessageResultPageProvider>,
		);

		expect(scrolledTo).toEqual([SOLUTION_ID]);
	});

	it("ignores hashes that do not point at a message", () => {
		window.location.hash = "#pricing";
		const scrolledTo: Array<string> = [];

		render(
			<MessageResultPageProvider>
				<FakeRepliesList
					scroller={(id) => {
						scrolledTo.push(id);
						return true;
					}}
				/>
			</MessageResultPageProvider>,
		);

		expect(scrolledTo).toEqual([]);
	});
});
