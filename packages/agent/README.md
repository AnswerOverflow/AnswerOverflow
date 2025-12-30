Vendored from https://github.com/get-convex/agent.git


# Convex Agent Component

[![npm version](https://badge.fury.io/js/@convex-dev%2fagent.svg)](https://badge.fury.io/js/@convex-dev%2fagent)

Convex provides powerful building blocks for building agentic AI applications,
leveraging Components and existing Convex features.

With Convex, you can separate your long-running agentic workflows from your UI,
without the user losing reactivity and interactivity.

```sh
npm i @convex-dev/agent
```

<!-- START: Include on https://convex.dev/components -->

AI Agents, built on Convex.
[Check out the docs here](https://docs.convex.dev/agents).

The Agent component is a core building block for building AI agents. It manages
threads and messages, around which you Agents can cooperate in static or dynamic
workflows.

- [Agents](https://docs.convex.dev/agents/agent-usage) provide an abstraction
  for using LLMs to represent units of use-case-specific prompting with
  associated models, prompts,
  [Tool Calls](https://docs.convex.dev/agents/tools), and behavior in relation
  to other Agents, functions, APIs, and more.
- [Threads](https://docs.convex.dev/agents/threads) persist
  [messages](https://docs.convex.dev/agents/messages) and can be shared by
  multiple users and agents (including
  [human agents](https://docs.convex.dev/agents/human-agents)).
- Streaming text and objects using deltas over websockets so all clients stay in
  sync efficiently, without http streaming. Enables streaming from async
  functions.
- [Conversation context](https://docs.convex.dev/agents/context) is
  automatically included in each LLM call, including built-in hybrid vector/text
  search for messages in the thread and opt-in search for messages from other
  threads (for the same specified user).
- [RAG](https://docs.convex.dev/agents/rag) techniques are supported for prompt
  augmentation from other sources, either up front in the prompt or as tool
  calls. Integrates with the
  [RAG Component](https://www.convex.dev/components/rag), or DIY.
- [Workflows](https://docs.convex.dev/agents/workflows) allow building
  multi-step operations that can span agents, users, durably and reliably.
- [Files](https://docs.convex.dev/agents/files) are supported in thread history
  with automatic saving to [file storage](https://docs.convex.dev/file-storage)
  and ref-counting.
- [Debugging](https://docs.convex.dev/agents/debugging) is enabled by callbacks,
  the [agent playground](https://docs.convex.dev/agents/playground) where you
  can inspect all metadata and iterate on prompts and context settings, and
  inspection in the dashboard.
- [Usage tracking](https://docs.convex.dev/agents/usage-tracking) is easy to set
  up, enabling usage attribution per-provider, per-model, per-user, per-agent,
  for billing & more.
- [Rate limiting](https://docs.convex.dev/agents/rate-limiting), powered by the
  [Rate Limiter Component](https://www.convex.dev/components/rate-limiter),
  helps control the rate at which users can interact with agents and keep you
  from exceeding your LLM provider's limits.

[Read the associated Stack post here](https://stack.convex.dev/ai-agents).

[![Powerful AI Apps Made Easy with the Agent Component](https://thumbs.video-to-markdown.com/b323ac24.jpg)](https://youtu.be/tUKMPUlOCHY)
**Read the [docs](https://docs.convex.dev/agents) for more details.**

Play with the example:

```sh
git clone https://github.com/get-convex/agent.git
cd agent
npm run setup
npm run dev
```

Found a bug? Feature request?
[File it here](https://github.com/get-convex/agent/issues).

<!-- END: Include on https://convex.dev/components -->

[![DeepWiki](https://deepwiki.com/badge.svg)](https://deepwiki.com/get-convex/agent)

