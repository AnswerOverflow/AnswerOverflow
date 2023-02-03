# Contributing

Thank you for your interest in contributing to Answer Overflow! If you need any help, please reach out in our [Discord](https://discord.gg/Wny38ap7Tx)!

## If I have a change I want to make, do I create a PR or an issue first?

Please create an issue first, this will help us manage release notes and workshop the issue you wish to address before moving forward

## Development workflow

We use developer containers to ensure a consistent environment across all platforms, it is up to you whether to use them or not and there are instructions for setting up with both.

We recommend the use of dev containers to make your onboarding as easy as possible, below are instructions for setup on both, pick one to follow (dev containers is recommended)

## Dev containers

Follow this [Getting Started Guide](https://code.visualstudio.com/docs/devcontainers/containers) on how to setup dev containers for your system

## Local Environment

We use [yarn](https://pnpm.io) as our package manager, so make sure to [install](https://yarnpkg.com/getting-started/install) it first.

Along with this, you will need to have a [MySQL Server](https://dev.mysql.com/downloads/installer/) running

And an [Elastic Search](https://www.elastic.co/guide/en/elasticsearch/reference/current/install-elasticsearch.html) server setup

## VSCode users

There is a workspace file called answeroverflow.code-workspace, VSCode lets you open this folder as that workspace and it is recommended that you do your development work inside of this workspace as it will configure all of the settings for you

### Get it running

Copy the .env.example file in the root directory and create a new file titled .env

Follow the steps listed in .env.example to properly configure your environment variables

```bash
# in project root directory
yarn install
yarn db:push
yarn db:wipe
yarn dev
```

### Testing

```bash
# in project root directory
yarn test

# to test an individual package:
cd [apps|packages]/[package_name] yarn test:watch
```

### Linting

```bash
yarn lint:fix
```

### Building

```bash
yarn build
```

## Project overview

This project is a monorepo using Turborepo. In order to keep documentation up to date and accurate, please view the README of the package that you are developing on.

## Style Guide

Formatting is mostly controlled by ESLint, here are a few misc things that aren't:

- snake_case for names
- camelCase for functions
- Colocate test files next to the files that they test, i.e file.ts & file.test.ts
- Destructure props passed into components / functions
