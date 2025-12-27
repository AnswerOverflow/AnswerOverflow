import {
	ActionRow,
	Button,
	Container,
	Separator,
	TextDisplay,
	useInstance,
} from "@packages/reacord";
import { useEffect, useState } from "react";

const SAMPLE_RESPONSES = [
	`# Understanding React Server Components

React Server Components (RSCs) represent a fundamental shift in how we build React applications. Let me explain the key concepts:

## What are Server Components?

Server Components are React components that **render exclusively on the server**. They never ship JavaScript to the client, which means:

- \`Zero bundle size impact\`
- Direct database/filesystem access
- Improved performance for data-heavy UIs

## Example Code

\`\`\`tsx
async function UserProfile({ userId }: { userId: string }) {
  const user = await db.users.findById(userId);
  
  return (
    <div>
      <h1>{user.name}</h1>
      <p>{user.email}</p>
    </div>
  );
}
\`\`\`

## When to Use Them

1. **Data fetching** - When you need to load data from a database
2. **Large dependencies** - When using heavy libraries like syntax highlighters
3. **Static content** - For content that doesn't need interactivity

> **Pro tip:** Combine Server Components with Client Components for the best of both worlds!

That's a quick overview of RSCs. Let me know if you'd like me to dive deeper into any aspect!`,

	`## Discord Bot Best Practices

Here are some essential tips for building robust Discord bots:

### Rate Limiting

Always respect Discord's rate limits:
- Use exponential backoff
- Queue your requests
- Cache responses when possible

### Code Example

\`\`\`typescript
const sendWithRetry = async (channel, content, retries = 3) => {
  for (let i = 0; i < retries; i++) {
    try {
      return await channel.send(content);
    } catch (error) {
      if (error.code === 429) {
        await sleep(error.retryAfter * 1000);
      }
    }
  }
  throw new Error('Max retries exceeded');
};
\`\`\`

### Event Handling

| Event | Use Case |
|-------|----------|
| messageCreate | Respond to messages |
| interactionCreate | Handle slash commands |
| guildMemberAdd | Welcome new members |

**Remember:** Always handle errors gracefully and provide helpful feedback to users!`,

	`# TypeScript Generics Explained

Let me walk you through TypeScript generics with practical examples.

## Basic Syntax

\`\`\`typescript
function identity<T>(arg: T): T {
  return arg;
}
\`\`\`

## Real-World Example

Here's a useful generic utility:

\`\`\`typescript
type Result<T, E = Error> = 
  | { success: true; data: T }
  | { success: false; error: E };

function wrap<T>(fn: () => T): Result<T> {
  try {
    return { success: true, data: fn() };
  } catch (error) {
    return { success: false, error: error as Error };
  }
}
\`\`\`

### Key Benefits

- **Type safety** at compile time
- **Reusable** components and functions  
- **Self-documenting** code
- Better **IDE support** with autocomplete

> Generics are like *function parameters* but for types!`,
];

const PROMPTS = [
	"Explain React Server Components",
	"Discord bot best practices",
	"Explain TypeScript generics",
];

function useStreamingText(
	fullText: string,
	isStreaming: boolean,
	charsPerTick = 3,
) {
	const [displayedText, setDisplayedText] = useState("");
	const [isComplete, setIsComplete] = useState(false);

	useEffect(() => {
		if (!isStreaming) {
			setDisplayedText("");
			setIsComplete(false);
			return;
		}

		setDisplayedText("");
		setIsComplete(false);
		let currentIndex = 0;

		const interval = setInterval(() => {
			if (currentIndex >= fullText.length) {
				setIsComplete(true);
				clearInterval(interval);
				return;
			}

			const nextChunk = Math.min(
				currentIndex + charsPerTick + Math.floor(Math.random() * 3),
				fullText.length,
			);
			setDisplayedText(fullText.slice(0, nextChunk));
			currentIndex = nextChunk;
		}, 50);

		return () => clearInterval(interval);
	}, [fullText, isStreaming, charsPerTick]);

	return { displayedText, isComplete };
}

export function LLMStreamingScenario() {
	const instance = useInstance();
	const [selectedPromptIndex, setSelectedPromptIndex] = useState(0);
	const [isStreaming, setIsStreaming] = useState(false);
	const [streamKey, setStreamKey] = useState(0);

	const currentResponse = SAMPLE_RESPONSES[selectedPromptIndex] ?? "";
	const currentPrompt = PROMPTS[selectedPromptIndex] ?? "";

	const { displayedText, isComplete } = useStreamingText(
		currentResponse,
		isStreaming,
	);

	const startStreaming = (promptIndex: number) => {
		setSelectedPromptIndex(promptIndex);
		setIsStreaming(true);
		setStreamKey((k) => k + 1);
	};

	const stopStreaming = () => {
		setIsStreaming(false);
	};

	return (
		<>
			<Container accentColor={0x5865f2}>
				<TextDisplay>## LLM Streaming Demo</TextDisplay>
				<TextDisplay>
					Simulates streaming markdown responses from an AI assistant, similar
					to `useChat` from the AI SDK.
				</TextDisplay>
			</Container>

			<Separator />

			{!isStreaming && !displayedText && (
				<Container accentColor={0x99aab5}>
					<TextDisplay>_Select a prompt to start streaming..._</TextDisplay>
				</Container>
			)}

			{(isStreaming || displayedText) && (
				<>
					<Container accentColor={0x2f3136}>
						<TextDisplay>**User:** {currentPrompt}</TextDisplay>
					</Container>

					<Separator spacing="small" />

					<Container
						key={streamKey}
						accentColor={isComplete ? 0x57f287 : 0xfee75c}
					>
						<TextDisplay>**Assistant:** {isComplete ? "✓" : "⏳"}</TextDisplay>
						<Separator spacing="small" />
						<TextDisplay>
							{displayedText || "_Starting response..._"}
						</TextDisplay>
					</Container>
				</>
			)}

			<Separator />

			<ActionRow>
				{PROMPTS.map((prompt, index) => (
					<Button
						key={prompt}
						label={prompt.slice(0, 20) + (prompt.length > 20 ? "..." : "")}
						style={
							selectedPromptIndex === index && isStreaming
								? "primary"
								: "secondary"
						}
						disabled={isStreaming}
						onClick={() => startStreaming(index)}
					/>
				))}
			</ActionRow>

			<ActionRow>
				<Button
					label="Stop"
					style="danger"
					disabled={!isStreaming || isComplete}
					onClick={stopStreaming}
				/>
				<Button
					label="Restart"
					style="primary"
					disabled={!displayedText}
					onClick={() => startStreaming(selectedPromptIndex)}
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
