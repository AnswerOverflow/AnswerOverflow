# DB

## Package Philosophy

This is where the database clients meet up. The output of the functions for this package can be composed of data from multiple database sources in order to give the best developer experience when working.

Along with this, this package handles validation before performing writes to the database.

i.e Before upserting a message for a user in `upsertMessage()`, it will fetch the user server settings to validate that they have message indexing enabled before doing the database write.

This is to put these fundamental permission checks as close to the database as possible in order to prevent them from being missed.

### Core dependencies

- `@answeroverflow/elastic-types`
- `@answeroverflow/prisma-types`
