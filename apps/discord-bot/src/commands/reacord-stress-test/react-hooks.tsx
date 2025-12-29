import {
	ActionRow,
	Button,
	Container,
	ModalButton,
	Option,
	Select,
	Separator,
	TextDisplay,
	useInstance,
} from "@packages/reacord";
import {
	memo,
	type Ref,
	useCallback,
	useDebugValue,
	useEffect,
	useId,
	useImperativeHandle,
	useLayoutEffect,
	useMemo,
	useReducer,
	useRef,
	useState,
	useSyncExternalStore,
} from "react";

type CounterAction =
	| { type: "increment" }
	| { type: "decrement" }
	| { type: "reset" }
	| { type: "set"; value: number };

interface CounterState {
	count: number;
	history: number[];
}

function counterReducer(
	state: CounterState,
	action: CounterAction,
): CounterState {
	switch (action.type) {
		case "increment":
			return {
				count: state.count + 1,
				history: [...state.history.slice(-4), state.count + 1],
			};
		case "decrement":
			return {
				count: state.count - 1,
				history: [...state.history.slice(-4), state.count - 1],
			};
		case "reset":
			return { count: 0, history: [0] };
		case "set":
			return {
				count: action.value,
				history: [...state.history.slice(-4), action.value],
			};
	}
}

function useCustomHook(label: string) {
	const [value, setValue] = useState(0);
	useDebugValue(value > 0 ? `${label}: Positive` : `${label}: Non-positive`);
	return [value, setValue] as const;
}

let externalCounter = 0;
const listeners = new Set<() => void>();

function subscribeToExternal(callback: () => void) {
	listeners.add(callback);
	return () => listeners.delete(callback);
}

function getExternalSnapshot() {
	return externalCounter;
}

function incrementExternal() {
	externalCounter++;
	listeners.forEach((listener) => listener());
}

interface ExpensiveChildProps {
	value: number;
	onIncrement: () => void;
}

const ExpensiveChild = memo(function ExpensiveChild({
	value,
}: ExpensiveChildProps) {
	const renderCount = useRef(0);
	renderCount.current++;

	return (
		<Container accentColor={0x99aab5}>
			<TextDisplay>**Memoized Child Component**</TextDisplay>
			<TextDisplay>Value: {value}</TextDisplay>
			<TextDisplay>Render count: {renderCount.current}</TextDisplay>
			<TextDisplay>
				_This component only re-renders when props change_
			</TextDisplay>
		</Container>
	);
});

interface ImperativeAPI {
	focus: () => void;
	getValue: () => string;
	reset: () => void;
}

function ImperativeChild({ ref }: { ref?: Ref<ImperativeAPI> }) {
	const [internalValue, setInternalValue] = useState("Initial");
	const [focused, setFocused] = useState(false);

	useImperativeHandle(
		ref,
		() => ({
			focus: () => setFocused(true),
			getValue: () => internalValue,
			reset: () => {
				setInternalValue("Reset");
				setFocused(false);
			},
		}),
		[internalValue],
	);

	return (
		<Container accentColor={focused ? 0x57f287 : 0x2f3136}>
			<TextDisplay>**Imperative Handle Child**</TextDisplay>
			<TextDisplay>Internal value: {internalValue}</TextDisplay>
			<TextDisplay>Focused: {focused ? "Yes" : "No"}</TextDisplay>
		</Container>
	);
}

type Tab = "reducer" | "refs" | "memo" | "sync" | "effects";

export function ReactHooksScenario() {
	const instance = useInstance();
	const componentId = useId();
	const [activeTab, setActiveTab] = useState<Tab>("reducer");

	const [state, dispatch] = useReducer(counterReducer, {
		count: 0,
		history: [0],
	});

	const [customValue, setCustomValue] = useCustomHook("Counter");

	const externalValue = useSyncExternalStore(
		subscribeToExternal,
		getExternalSnapshot,
	);

	const [memoInput, setMemoInput] = useState(5);
	const expensiveComputation = useMemo(() => {
		let result = 0;
		for (let i = 0; i < memoInput * 1000; i++) {
			result += Math.sqrt(i);
		}
		return Math.floor(result);
	}, [memoInput]);

	const [childValue, setChildValue] = useState(0);
	const handleChildIncrement = useCallback(() => {
		setChildValue((v) => v + 1);
	}, []);

	const imperativeRef = useRef<ImperativeAPI>(null);
	const [imperativeResult, setImperativeResult] = useState<string | null>(null);

	const [effectLog, setEffectLog] = useState<string[]>([]);
	const [effectTrigger, setEffectTrigger] = useState(0);

	useEffect(() => {
		if (effectTrigger === 0) return;
		setEffectLog((prev) => [
			...prev.slice(-4),
			`useEffect ran at ${new Date().toLocaleTimeString()}`,
		]);
	}, [effectTrigger]);

	useLayoutEffect(() => {
		if (effectTrigger === 0) return;
		setEffectLog((prev) => [
			...prev.slice(-4),
			`useLayoutEffect ran (before paint)`,
		]);
	}, [effectTrigger]);

	return (
		<>
			<Container accentColor={0x5865f2}>
				<TextDisplay>## React Hooks Stress Test</TextDisplay>
				<TextDisplay>
					Testing all classic React hooks. **Component ID:** `{componentId}`
				</TextDisplay>
			</Container>

			<ActionRow>
				<Button
					label="Reducer"
					style={activeTab === "reducer" ? "primary" : "secondary"}
					onClick={() => setActiveTab("reducer")}
				/>
				<Button
					label="Refs"
					style={activeTab === "refs" ? "primary" : "secondary"}
					onClick={() => setActiveTab("refs")}
				/>
				<Button
					label="Memo"
					style={activeTab === "memo" ? "primary" : "secondary"}
					onClick={() => setActiveTab("memo")}
				/>
				<Button
					label="Sync"
					style={activeTab === "sync" ? "primary" : "secondary"}
					onClick={() => setActiveTab("sync")}
				/>
				<Button
					label="Effects"
					style={activeTab === "effects" ? "primary" : "secondary"}
					onClick={() => setActiveTab("effects")}
				/>
			</ActionRow>

			<Separator />

			{activeTab === "reducer" && (
				<>
					<Container accentColor={0x2f3136}>
						<TextDisplay>### useReducer</TextDisplay>
						<TextDisplay>
							Complex state management with actions and reducers.
						</TextDisplay>
					</Container>

					<Container
						accentColor={
							state.count > 0 ? 0x57f287 : state.count < 0 ? 0xed4245 : 0x99aab5
						}
					>
						<TextDisplay>**Count:** {state.count}</TextDisplay>
						<TextDisplay>**History:** [{state.history.join(", ")}]</TextDisplay>
					</Container>

					<ActionRow>
						<Button
							label="−"
							style="danger"
							onClick={() => dispatch({ type: "decrement" })}
						/>
						<Button
							label="+"
							style="success"
							onClick={() => dispatch({ type: "increment" })}
						/>
						<Button
							label="Reset"
							style="secondary"
							onClick={() => dispatch({ type: "reset" })}
						/>
						<ModalButton
							label="Set Value"
							style="primary"
							modalTitle="Set Counter Value"
							fields={[
								{
									type: "textInput",
									id: "value",
									label: "New Value",
									style: "short",
									placeholder: "Enter a number...",
									required: true,
								},
							]}
							onSubmit={(values) => {
								const val = parseInt(values.getTextInput("value") ?? "0", 10);
								if (!Number.isNaN(val)) {
									dispatch({ type: "set", value: val });
								}
							}}
						/>
					</ActionRow>

					<Container accentColor={0x99aab5}>
						<TextDisplay>### useDebugValue (Custom Hook)</TextDisplay>
						<TextDisplay>Custom value: {customValue}</TextDisplay>
						<TextDisplay>_Debug value visible in React DevTools_</TextDisplay>
					</Container>

					<ActionRow>
						<Button
							label="Increment Custom"
							style="primary"
							onClick={() => setCustomValue(customValue + 1)}
						/>
					</ActionRow>
				</>
			)}

			{activeTab === "refs" && (
				<>
					<Container accentColor={0x2f3136}>
						<TextDisplay>### useRef + useImperativeHandle</TextDisplay>
						<TextDisplay>
							Refs for mutable values and imperative APIs.
						</TextDisplay>
					</Container>

					<ImperativeChild ref={imperativeRef} />

					{imperativeResult && (
						<Container accentColor={0x57f287}>
							<TextDisplay>**Result:** {imperativeResult}</TextDisplay>
						</Container>
					)}

					<ActionRow>
						<Button
							label="Focus"
							style="primary"
							onClick={() => {
								imperativeRef.current?.focus();
								setImperativeResult("Called focus()");
							}}
						/>
						<Button
							label="Get Value"
							style="secondary"
							onClick={() => {
								const val = imperativeRef.current?.getValue();
								setImperativeResult(`getValue() = "${val}"`);
							}}
						/>
						<Button
							label="Reset"
							style="danger"
							onClick={() => {
								imperativeRef.current?.reset();
								setImperativeResult("Called reset()");
							}}
						/>
					</ActionRow>
				</>
			)}

			{activeTab === "memo" && (
				<>
					<Container accentColor={0x2f3136}>
						<TextDisplay>### useMemo + useCallback + memo()</TextDisplay>
						<TextDisplay>
							Memoization for expensive computations and stable references.
						</TextDisplay>
					</Container>

					<Container accentColor={0x57f287}>
						<TextDisplay>**useMemo Result**</TextDisplay>
						<TextDisplay>Input: {memoInput}</TextDisplay>
						<TextDisplay>Computed: {expensiveComputation}</TextDisplay>
						<TextDisplay>_Only recomputes when input changes_</TextDisplay>
					</Container>

					<Select
						placeholder="Select computation size"
						value={String(memoInput)}
						onSelect={(val) => setMemoInput(parseInt(val, 10))}
					>
						<Option value="1" label="Small (1)" />
						<Option value="5" label="Medium (5)" />
						<Option value="10" label="Large (10)" />
						<Option value="50" label="Very Large (50)" />
					</Select>

					<Separator />

					<ExpensiveChild
						value={childValue}
						onIncrement={handleChildIncrement}
					/>

					<ActionRow>
						<Button
							label="Increment Child"
							style="primary"
							onClick={handleChildIncrement}
						/>
						<Button
							label="Force Parent Render"
							style="secondary"
							onClick={() => setMemoInput((v) => v)}
						/>
					</ActionRow>
				</>
			)}

			{activeTab === "sync" && (
				<>
					<Container accentColor={0x2f3136}>
						<TextDisplay>### useSyncExternalStore</TextDisplay>
						<TextDisplay>
							Subscribe to external data sources outside React.
						</TextDisplay>
					</Container>

					<Container accentColor={0x57f287}>
						<TextDisplay>**External Counter:** {externalValue}</TextDisplay>
						<TextDisplay>
							_This value is managed outside React state_
						</TextDisplay>
					</Container>

					<ActionRow>
						<Button
							label="Increment External"
							style="primary"
							onClick={incrementExternal}
						/>
					</ActionRow>
				</>
			)}

			{activeTab === "effects" && (
				<>
					<Container accentColor={0x2f3136}>
						<TextDisplay>### useEffect + useLayoutEffect</TextDisplay>
						<TextDisplay>
							Side effects with different timing. Trigger count: {effectTrigger}
						</TextDisplay>
					</Container>

					<Container accentColor={0x99aab5}>
						<TextDisplay>**Effect Log:**</TextDisplay>
						{effectLog.length === 0 ? (
							<TextDisplay>_No effects triggered yet_</TextDisplay>
						) : (
							effectLog.map((log, i) => (
								<TextDisplay key={i}>• {log}</TextDisplay>
							))
						)}
					</Container>

					<ActionRow>
						<Button
							label="Trigger Effects"
							style="primary"
							onClick={() => setEffectTrigger((t) => t + 1)}
						/>
						<Button
							label="Clear Log"
							style="secondary"
							onClick={() => setEffectLog([])}
						/>
					</ActionRow>
				</>
			)}

			<Separator />

			<ActionRow>
				<Button
					label="Close"
					style="danger"
					onClick={() => instance.destroy()}
				/>
			</ActionRow>
		</>
	);
}
