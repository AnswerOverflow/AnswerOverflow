
<p align='center'>
        <a href='https://answeroverflow.com/'>
        <img src="https://www.answeroverflow.com/content/branding/AnswerOverflowLOGO.png">
    </a>
</p>

<div align="center">
  <h1>Answer Overflow</h1>
  <h3>Improve & Google Index Discord Help Channels</h3>
  <h4>⚠ Currently In Breaking Development ⚠</h4>
  <p>While you are welcome to submit issues / PRs - while the project base is created a lot of changes will be happening to the repo</p>
</div>

## Developing

### Environment Setup

Answer Overflow utilizes VSCode features such as workspaces and development containers to provide a fast and consistent cross platform development experience. If you already have VSCode and Docker installed then setting up should be as quick as opening the cloned project in VSCode and running `reopen project in container` along with `open workspace`

#### Windows

1. [Install VSCode](https://code.visualstudio.com/)

2. [Install Docker](https://www.docker.com/)

3. Clone & Open

### Develop

With Visual Studio opened in a development container, open a folder in the root workspace

* Run the whole project

    ```pnpm run dev```
* Run a single app

    ```pnpm turbo run dev --filter='app-name'```
* Install a package
    ```pnpm workspace <workspace> add <package>```
