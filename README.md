<p align="center">
  <img src="./assets/answer-overflow-banner-v3.png" alt="Answer Overflow" />
</p>

# Answer Overflow

Questions get answered in your Discord, then that knowledge disappears. Answer Overflow makes it findable - in Google, ChatGPT, your AI agents via MCP, wherever people are looking for answers.


## What it does

1. Bot joins your Discord server
2. You select which channels to index
3. Creates indexed web pages from threads
4. Your content is indexed by search engines like Google

## Project Structure

```
apps/
  discord-bot/    # The Discord bot (discord.js + Effect)
  main-site/      # Next.js web app
  docs/           # Documentation site

packages/
  database/       # Convex backend + auth
  ui/             # Shared React components
  ai/             # AI features
  agent/          # AI agent system
  ...
```

## Development

```bash
bun install
bun dev
```

Requires:
- Bun 1.3+
- Node 18+
- A Discord bot token (see CONTRIBUTING.md)

## Stack

- **Runtime**: Bun
- **Database**: Convex
- **Web**: Next.js 16
- **Bot**: discord.js
- **Types**: Effect + TypeScript
- **Auth**: Better Auth

## Links

- **Site**: [answeroverflow.com](https://www.answeroverflow.com/)
- **Discord**: [discord.answeroverflow.com](https://discord.answeroverflow.com/)
- **Docs**: [docs.answeroverflow.com](https://docs.answeroverflow.com/)

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md)

## License

[MIT](./LICENSE.md)
