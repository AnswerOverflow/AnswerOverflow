# Notes on how we need to handle protecting access to convex functions:

In order to call a function outside of the Convex environment, it has to be public regardless of if it's just internal or not
Due to this, we need to be mindful about how functions are called
Keep all functions as public internal by default

## Language:

- Public means any Convex functions that are non internal
- User facing means any Convex functions that are meant to be called by the user
- Public internal means any Convex functions that are meant to be called by the backend but are public in order to be able to be called
- On permissions 'view the dashboard' means anyone with the 'Manage Guild' permission

## Code Structure:

- Use customFunctions (https://github.com/get-convex/convex-helpers) to make reusable logic (import { } from "convex-helpers/server/customFunctions";)
- Follow the rules of the convex_rules.mdc and convex-tips.mdc files when writing convex functions

## How to handle convex function calls that need to be made from backend to Convex:

The following applies to all

- The backend sends a 'BACKEND_ACCESS_TOKEN' as part of the request to the convex function
- The convex function checks if the 'BACKEND_ACCESS_TOKEN' is valid by comparing it to the 'BACKEND_ACCESS_TOKEN' in the environment variables
- If the 'BACKEND_ACCESS_TOKEN' is valid, the convex function proceeds with the request
- If the 'BACKEND_ACCESS_TOKEN' is invalid, the convex function returns an error

## Preventing abuse

- All public functions must have a signed in user calling them
- All public functions must have rate limits based on the user's id
