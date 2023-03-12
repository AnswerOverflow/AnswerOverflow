# API

## Package Philosophy

Be a lightweight layer that handles permissions for user calls. Tests should only validate inputs to the routes and permission outputs.

Anything more complex, i.e preventing a user from enabling publicly displaying their messages when they have indexing disabled should go in the `@answeroverflow/db` package

Along with the intentions above, this also handles error messages so those can be shared between the discord bot and the website

i.e A user trying to set their consent status to true when it is already set to true should throw an error if the procedure they're calling is for specifically updating their consent

### Core dependencies

-   tRPC
-   Zod
-   `@answeroverflow/db`
