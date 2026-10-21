// Started by runtime.test.ts in a child process.
import { Console, Effect, Layer } from "effect";
import { runMain } from "../runtime";

const AppLayer = Layer.scopedDiscard(
	Effect.addFinalizer(() => Console.log("runtime disposed")),
);

const program = Effect.gen(function* () {
	yield* Effect.addFinalizer(() =>
		Effect.sleep("50 millis").pipe(
			Effect.zipRight(Console.log("gateway closed")),
		),
	);
	yield* Console.log("ready");
	if (process.argv.includes("--fail")) {
		return yield* Effect.fail("boom");
	}
	return yield* Effect.never;
}).pipe(Effect.scoped);

runMain(program, AppLayer);
