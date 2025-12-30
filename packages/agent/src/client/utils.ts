import type { StepResult, StopCondition } from "ai";

export async function willContinue(
	steps: StepResult<any>[],

	stopWhen: StopCondition<any> | Array<StopCondition<any>> | undefined,
): Promise<boolean> {
	const step = steps.at(-1)!;
	// we aren't doing another round after a tool result
	// TODO: whether to handle continuing after too much context used..
	if (step.finishReason !== "tool-calls") return false;
	// we don't have a tool result, so we'll wait for more
	if (step.toolCalls.length > step.toolResults.length) return false;
	if (Array.isArray(stopWhen)) {
		return (await Promise.all(stopWhen.map(async (s) => s({ steps })))).every(
			(stop) => !stop,
		);
	}
	return !!stopWhen && !(await stopWhen({ steps }));
}

export function errorToString(error: unknown): string {
	if (error instanceof Error) {
		return error.message;
	}
	return String(error);
}
