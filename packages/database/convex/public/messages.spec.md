# Expected functionality for functions in public/messages.ts

## getMessages

Takes in a message id, returns all messages after it in the channel.

Forum channel:

- Returns all messages after that message id inside of the thread.

Thread in a text channel:

- Returns all messages after that message id inside of the thread.

Regular text channel:

- Returns all messages after that message id in the channel.

Other:

- If the server has 'considerAllMessagesPublic' enabled and users have no explicit consent to display their messages, the messages in indexed channels are shown.
- If an author is in ignored all author ids the messages are not shown.
- If the server does not have consider all messages in indexed channels public disabled and the user has no explicit consent to display their messages the messages are not shown.
- If the server has consider all messages in indexed channels public disabled and the user has explicit consent to display their messages the messages are shown.
