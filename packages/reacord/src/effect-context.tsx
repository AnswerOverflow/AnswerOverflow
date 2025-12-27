import type { Effect } from "effect";
import { createContext, useContext, useEffect, useState } from "react";

type RunEffect = <A, E, R>(effect: Effect.Effect<A, E, R>) => Promise<A>;

const EffectRuntimeContext = createContext<RunEffect | null>(null);

export function EffectRuntimeProvider({
	runEffect,
	children,
}: {
	runEffect: RunEffect;
	children: React.ReactNode;
}) {
	return (
		<EffectRuntimeContext.Provider value={runEffect}>
			{children}
		</EffectRuntimeContext.Provider>
	);
}

export function useRunEffect(): RunEffect {
	const runEffect = useContext(EffectRuntimeContext);
	if (!runEffect) {
		throw new Error(
			"useRunEffect must be used within an EffectRuntimeProvider",
		);
	}
	return runEffect;
}

type AsyncState<A> =
	| { status: "loading" }
	| { status: "success"; value: A }
	| { status: "error"; error: unknown };

export function useEffectAsync<A, E, R>(
	effectFn: () => Effect.Effect<A, E, R>,
): AsyncState<A> {
	const runEffect = useRunEffect();
	const [state, setState] = useState<AsyncState<A>>({ status: "loading" });
	const [effectRef] = useState(() => ({ fn: effectFn }));

	useEffect(() => {
		let cancelled = false;
		setState({ status: "loading" });

		runEffect(effectRef.fn()).then(
			(value) => {
				if (!cancelled) {
					setState({ status: "success", value });
				}
			},
			(error: unknown) => {
				if (!cancelled) {
					setState({ status: "error", error });
				}
			},
		);

		return () => {
			cancelled = true;
		};
	}, [runEffect, effectRef]);

	return state;
}

export function useEffectCallback<Args extends readonly unknown[], A, E, R>(
	callback: (...args: Args) => Effect.Effect<A, E, R>,
): (...args: Args) => Promise<A> {
	const runEffect = useRunEffect();
	return (...args: Args) => runEffect(callback(...args));
}
