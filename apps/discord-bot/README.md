# Answer Overflow Discord Bot

## Folder Structure

### Commands

Slash & Application commands go here.

    Example: /channel-settings open command

### components

React components used for building out menus. These components should be **ephemeral** only as they do not persist on a restart. They are mainly used for handling menu style interactions.

      Example: /manage_account menu.

### interaction_handlers

Long running button interactions that need to run again on a bot restart.

      Example: The consent button is sent in announcement channels and can be used months after sending it, it's important to capture this interaction

### precondiitons

      Checks to run before executing a command

      Example: Check if the person running the command is a developer

### listeners

Any events the bot needs to respond to go here.

    Example: On Guild Join -> Sync server to database

### routes

Used to expose API calls to remotely manage the bot

      Example: Refresh server API endpoint called when viewing from the web dashboard

### utils

Misc utility functions. Try to keep related functions in the same files as they may be extracted out into their own packages.

      Example: Converting data types from Discord -> Answer Overflow

## Testing Methodology

1. We're not recreating Discord, we're just ensuring each element of the bot responds correctly to interactions
2. Feel free to hack the mock data a bit to get it to work
3. Test as much as possible outside of the Discord bot package, this is mainly used for ensuring events are firing
