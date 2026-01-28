# Changelog

## 1.0.0 (2026-01-28)


### Features

* add @packages/github-api package ([#847](https://github.com/AnswerOverflow/AnswerOverflow/issues/847)) ([9f8a091](https://github.com/AnswerOverflow/AnswerOverflow/commit/9f8a0918c2eeb0b6d854ec1405fb69d156197f03))
* add confect schemas and setup in database ([#848](https://github.com/AnswerOverflow/AnswerOverflow/issues/848)) ([c8acb41](https://github.com/AnswerOverflow/AnswerOverflow/commit/c8acb41b0f716a40c086eaddd2bae2a470105b32))
* add date range selection to dashboard charts ([7c6fc9f](https://github.com/AnswerOverflow/AnswerOverflow/commit/7c6fc9f55cd78bc930d9b37e17689462a401f7cc))
* add options to lock and archive threads on marking solutions ([d7cc9a6](https://github.com/AnswerOverflow/AnswerOverflow/commit/d7cc9a6b2de301103191d7fa7a03c8b536f248b4))
* add sign-in requirement for certain models in chat interface ([72df330](https://github.com/AnswerOverflow/AnswerOverflow/commit/72df330853ba9bb5c17d59e4d9bc3c65d5d66eea))
* ai powered onboarding ([#797](https://github.com/AnswerOverflow/AnswerOverflow/issues/797)) ([f426d8e](https://github.com/AnswerOverflow/AnswerOverflow/commit/f426d8eee43768b62d1bc1b360c0deeb1ef666b0))


### Bug Fixes

* add components validator to message fields in publicSchemas ([e7bc8aa](https://github.com/AnswerOverflow/AnswerOverflow/commit/e7bc8aa39c2a275372adb7cd7ee3be3cb8020c7f))
* cache auth clients by baseURL for tenant subpath support ([#806](https://github.com/AnswerOverflow/AnswerOverflow/issues/806)) ([20fc48a](https://github.com/AnswerOverflow/AnswerOverflow/commit/20fc48aa636a953476022bcd58bae8357cfde473))
* don't early error with refresh tokens ([#794](https://github.com/AnswerOverflow/AnswerOverflow/issues/794)) ([f4959c7](https://github.com/AnswerOverflow/AnswerOverflow/commit/f4959c7fae4d448a9b41458731452673e12504d6))
* fallback to HTTP client on WebSocket timeout errors ([#799](https://github.com/AnswerOverflow/AnswerOverflow/issues/799)) ([e8a0acb](https://github.com/AnswerOverflow/AnswerOverflow/commit/e8a0acbbf46979b96803657b007ab35cb319ab31))
* preserve solution status when messages are edited ([#879](https://github.com/AnswerOverflow/AnswerOverflow/issues/879)) ([0f91be7](https://github.com/AnswerOverflow/AnswerOverflow/commit/0f91be7938f55bf6de216575ff76e8d01b887d98)), closes [#875](https://github.com/AnswerOverflow/AnswerOverflow/issues/875)
* prevent long server names from hiding setup button on dashboard ([#871](https://github.com/AnswerOverflow/AnswerOverflow/issues/871)) ([02f244f](https://github.com/AnswerOverflow/AnswerOverflow/commit/02f244f19d1d336c6770e6d8cff10ea618094c6c))
* reset ChatInterface state when navigating to new chat ([c62b78f](https://github.com/AnswerOverflow/AnswerOverflow/commit/c62b78f0f57bdb54a0e20c77de955b6127a6751a))
* resolve type errors and lint issues in UI components ([07621e6](https://github.com/AnswerOverflow/AnswerOverflow/commit/07621e68762e5dfb392225bc1461eef7d17c3f6c))
* treat answeroverflow.dev as main site ([#878](https://github.com/AnswerOverflow/AnswerOverflow/issues/878)) ([2bc82a0](https://github.com/AnswerOverflow/AnswerOverflow/commit/2bc82a07ef5c898a141c733f8d2593598d39e78a))
* use discord-api-types instead of discord.js in Convex functions ([01e4811](https://github.com/AnswerOverflow/AnswerOverflow/commit/01e4811d1144b1280ebad049d81ced1b122ad439))
* use streaming tar extraction to reduce memory usage for large repos ([#862](https://github.com/AnswerOverflow/AnswerOverflow/issues/862)) ([e7a25ec](https://github.com/AnswerOverflow/AnswerOverflow/commit/e7a25eccfb412f8b2c23253d09de556f312cf2ff))
