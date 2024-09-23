# Headless Answer Overflow

## Overview

Each month we need a cron job to run that will reset the number of api calls used for each user back to 0.

## Requests

Bearer token is required for all requests.
```json
{
  "Authorization": "Bearer <token>"
}
```

## Response

Includes the number of api calls remaining in the headers

Headers
```json
{
  "x-requests-remaining": "number"
}
```

## Routes

### Message Result Page (/api/v1/m/[id])

Generates the page for a thread

```ts
type Response = {
  "server": ServerPublic,
  "messages": Message[],
  "channel": ChannelPublic,
  "thread": ThreadPublic | undefined
}
```

### List all threads (GET /api/v1/c/[id]/threads)

List all threads in a channel

```ts
type Response = {
  "threads": ThreadPublic[]
}
```
### Search (GET /api/v1/c/[id]/search)

Search messages in a server

```ts
type Response = {
  "results": {
    "message": Message,
    "channel": ChannelPublic,
    "thread": ThreadPublic | undefined,
    "server": ServerPublic
  }[]
}
```




