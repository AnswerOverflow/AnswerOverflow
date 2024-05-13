# Contributing

Thank you for your interest in contributing to Answer Overflow! If you need any help, please reach out in our [Discord](https://discord.answeroverflow.com/)!

### VSCode users

There is a workspace file called answeroverflow.code-workspace, VSCode lets you open this folder as that workspace and it is recommended that you do your development work inside of this workspace as it will configure all of the settings for you

! The workspace is set to hide all "useless" files (i.e node_modules) if you for some reason need to access them, comment out the line hiding them in the workspace file !

### Get it running

Copy the .env.example file in the root directory and create a new file titled .env

Follow the steps listed in .env.example to properly configure your environment variables

```bash
# in project root directory
pnpm install
pnpm db:push
pnpm db:wipe
pnpm dev
```

### Testing

```bash
# in project root directory
pnpm test

# to test an individual package:
cd [apps|packages]/[package_name] pnpm test:watch
```

### Linting

```bash
pnpm lint:fix
```

### Building

```bash
pnpm build
```

## Setting up your Developer Bot

Head to the [Discord Developer Portal](https://discord.com/developers/applications), and create a new application (call it something like "AO Dev Test"), and optionally a testing server in Discord.

In the portal, click "Bot" and add a bot.

Enable the following intents:

- `Server Members`
- `Message Content`

<div align="center">
  <figure>
    <img src="./assets/bot-intents.png" alt="Bot Intents Settings"/>
  </figure>
</div>

You'll also want to copy your token, and save it someplace safe (like GitHub Secrets).

Next, in `OAuth2->General`, you'll want to grab your Client ID and Client Secret for safekeeping as well.

Add a redirect, and point it to `http://localhost:3000/api/auth/callback/discord` (if you're hosting on a VPS with Remote Environment, use your VPS IP in place of localhost)

Change the authorization method to "In-app Authorization", checking the `bot` and `applications.commands` scopes.

You'll want to enable the following bot permissions:

- `Manage Server`
- `Create Instant Invite`
- `Read Messages/View Channels`
- `Send Messages`
- `Create Public Threads`
- `Send Messages in Threads`
- `Manage Threads`
- `Embed Links`
- `Read Message History`
- `Add Reactions`
- `Use Slash Commands`

When you're done, it should look like this:

<div align="center">
  <figure>
    <img src="./assets/OAuth2-Settings.png" alt="OAuth2 Settings"/>
  </figure>
</div>

You can then generate a link from `OAuth2->URL Generator` using the `bot` and `applications.commands`, with the same permissions.

Replace your ID in this link: `https://discord.com/oauth2/authorize?client_id=YOUR_ID&permissions=328565083201&scope=bot+applications.commands`

Or use the [Discord Permissions Calculator](https://discordapi.com/permissions.html).

Add your bot to the server with the link and begin testing from your development machine.
