import {
	ActionRow,
	Button,
	Container,
	Separator,
	TextDisplay,
	useInstance,
} from "@packages/reacord";
import { type Ref, type RefObject, useCallback, useRef, useState } from "react";

interface LogEntry {
	id: string;
	timestamp: Date;
	type: "mount" | "cleanup" | "action";
	message: string;
}

function ChildWithRef({
	label,
	ref,
}: {
	label: string;
	ref?: Ref<{ getValue: () => string }>;
}) {
	const internalValue = useRef(`Value from ${label}`);

	const exposedRef = useCallback(
		(node: { getValue: () => string } | null) => {
			if (node === null) {
				return;
			}
			if (typeof ref === "function") {
				ref(node);
			} else if (ref && typeof ref === "object") {
				(ref as RefObject<{ getValue: () => string } | null>).current = node;
			}
		},
		[ref],
	);

	exposedRef({ getValue: () => internalValue.current });

	return (
		<Container accentColor={0x57f287}>
			<TextDisplay>**{label}**</TextDisplay>
			<TextDisplay>Internal value: {internalValue.current}</TextDisplay>
		</Container>
	);
}

interface TrackedComponentProps {
	id: string;
	onMount: (id: string) => void;
	onCleanup: (id: string) => void;
}

function TrackedComponent({ id, onMount, onCleanup }: TrackedComponentProps) {
	const refCallback = useCallback(
		(node: HTMLDivElement | null) => {
			if (node) {
				onMount(id);
				return () => {
					onCleanup(id);
				};
			}
		},
		[id, onMount, onCleanup],
	);

	void refCallback;

	return (
		<Container accentColor={0x5865f2}>
			<TextDisplay>**Component {id}**</TextDisplay>
			<TextDisplay>_This component tracks mount/cleanup via ref_</TextDisplay>
		</Container>
	);
}

export function React19RefScenario() {
	const instance = useInstance();
	const [logs, setLogs] = useState<LogEntry[]>([]);
	const [components, setComponents] = useState<string[]>(["A"]);
	const [refValue, setRefValue] = useState<string | null>(null);
	const childRef = useRef<{ getValue: () => string } | null>(null);

	const addLog = useCallback((type: LogEntry["type"], message: string) => {
		setLogs((prev) => [
			...prev.slice(-9),
			{
				id: `${Date.now()}-${Math.random()}`,
				timestamp: new Date(),
				type,
				message,
			},
		]);
	}, []);

	const handleMount = useCallback(
		(id: string) => {
			addLog("mount", `Component ${id} mounted`);
		},
		[addLog],
	);

	const handleCleanup = useCallback(
		(id: string) => {
			addLog("cleanup", `Component ${id} cleanup called`);
		},
		[addLog],
	);

	const addComponent = () => {
		const nextId = String.fromCharCode(65 + components.length);
		if (components.length < 5) {
			setComponents((prev) => [...prev, nextId]);
			addLog("action", `Added component ${nextId}`);
		}
	};

	const removeComponent = () => {
		if (components.length > 0) {
			const removed = components[components.length - 1];
			setComponents((prev) => prev.slice(0, -1));
			addLog("action", `Removed component ${removed}`);
		}
	};

	const readRef = () => {
		if (childRef.current) {
			const value = childRef.current.getValue();
			setRefValue(value);
			addLog("action", `Read ref value: ${value}`);
		} else {
			setRefValue(null);
			addLog("action", "Ref is null");
		}
	};

	return (
		<>
			<Container accentColor={0x5865f2}>
				<TextDisplay>## React 19: Ref as Prop + Cleanup Functions</TextDisplay>
				<TextDisplay>
					React 19 allows passing `ref` as a regular prop to function components
					(no `forwardRef` needed) and refs can return cleanup functions.
				</TextDisplay>
			</Container>

			<Separator />

			<Container accentColor={0x2f3136}>
				<TextDisplay>### Ref as Prop Demo</TextDisplay>
				<TextDisplay>
					The child component below receives `ref` as a prop directly.
				</TextDisplay>
			</Container>

			<ChildWithRef label="Direct Ref Child" ref={childRef} />

			<Container accentColor={refValue ? 0x57f287 : 0x99aab5}>
				<TextDisplay>
					**Last read value:** {refValue ?? "_Click 'Read Ref' to read_"}
				</TextDisplay>
			</Container>

			<Separator />

			<Container accentColor={0x2f3136}>
				<TextDisplay>
					### Tracked Components ({components.length}/5)
				</TextDisplay>
				<TextDisplay>
					Add/remove components to see mount and cleanup logs.
				</TextDisplay>
			</Container>

			{components.map((id) => (
				<TrackedComponent
					key={id}
					id={id}
					onMount={handleMount}
					onCleanup={handleCleanup}
				/>
			))}

			<Separator />

			<Container accentColor={0x2f3136}>
				<TextDisplay>### Event Log</TextDisplay>
				{logs.length === 0 ? (
					<TextDisplay>_No events yet_</TextDisplay>
				) : (
					logs.map((log) => (
						<TextDisplay key={log.id}>
							{log.type === "mount" && "🟢"}
							{log.type === "cleanup" && "🔴"}
							{log.type === "action" && "🔵"} [
							{log.timestamp.toLocaleTimeString()}] {log.message}
						</TextDisplay>
					))
				)}
			</Container>

			<ActionRow>
				<Button label="Read Ref" style="primary" onClick={readRef} />
				<Button
					label="Add Component"
					style="success"
					disabled={components.length >= 5}
					onClick={addComponent}
				/>
				<Button
					label="Remove Component"
					style="secondary"
					disabled={components.length === 0}
					onClick={removeComponent}
				/>
			</ActionRow>

			<ActionRow>
				<Button
					label="Clear Logs"
					style="secondary"
					onClick={() => setLogs([])}
				/>
				<Button
					label="Close"
					style="danger"
					onClick={() => instance.destroy()}
				/>
			</ActionRow>
		</>
	);
}
