# Fork n00b: Run Ask Ozzy locally

This guide is for complete beginners.

You do not need to understand coding, Node.js or Git before starting. By the end, you will have your own copy of Ask Ozzy running privately on your computer.

Following these instructions will not change Will’s original repository or the live Ask Ozzy website.

## What the terminology means

| Term       | Meaning                                                              |
| ---------- | -------------------------------------------------------------------- |
| Repository | The project and all its files                                        |
| Fork       | Your own GitHub copy of the repository                               |
| Clone      | A copy downloaded onto your computer                                 |
| Node.js    | The software that runs Ask Ozzy locally                              |
| npm        | The tool that installs the project’s required software and starts it |
| localhost  | A private website running only on your computer                      |
| Git Bash   | The terminal used to enter the commands below                        |

## What you need

Before starting, you need:

1. A GitHub account
2. Git Bash
3. Node.js LTS
4. A web browser

### Check whether everything is installed

Open Git Bash and run these commands one at a time:

```bash
git --version
node --version
npm --version
```

Each command should display a version number.

If `node` or `npm` is not found, install the current Node.js LTS version from [nodejs.org](https://nodejs.org/).

On Windows, you can alternatively open PowerShell and run:

```powershell
winget install OpenJS.NodeJS.LTS
```

After installing Node.js, close every Git Bash window and reopen Git Bash. npm is installed automatically with Node.js.

## Step 1: Create your fork

1. Open the [original Ask Ozzy repository](https://github.com/willspensley/brum-dashboard-).
2. Sign in to GitHub.
3. Select **Fork** in the top right.
4. Select your GitHub account as the owner.
5. Keep the existing repository name.
6. Select **Copy the main branch only**.
7. Select **Create fork**.

GitHub will create your own copy of the repository.

## Step 2: Download your fork

Open your fork on GitHub.

Select **Code**, select **HTTPS**, and copy the address shown.

Open Git Bash and run:

```bash
cd ~
git clone PASTE-YOUR-FORK-ADDRESS-HERE
cd brum-dashboard-
```

For example:

```bash
git clone https://github.com/YOUR-USERNAME/brum-dashboard-.git
cd brum-dashboard-
```

Replace `YOUR-USERNAME` with your own GitHub username.

The final hyphen in `brum-dashboard-` is part of the repository name.

## Step 3: Install the project

Inside the `brum-dashboard-` folder, run:

```bash
npm install
```

This downloads the software packages Ask Ozzy needs. It can take several minutes the first time.

You normally only need to run `npm install` once, or when the project dependencies change.

## Step 4: Start Ask Ozzy

Run:

```bash
npm run dev
```

Wait until Git Bash displays a local address, normally:

```text
http://localhost:3000
```

Open that address in your browser.

Keep Git Bash open while using Ask Ozzy. Closing Git Bash stops the local website.

A local development version may take slightly longer to load or compile pages than the live website. This is normal, particularly on the first visit.

## Step 5: Stop Ask Ozzy

Return to Git Bash and press:

```text
Ctrl+C
```

This stops the local server. It does not delete the project.

## Start Ask Ozzy again later

You do not need to reinstall Node.js or clone the repository again.

Open Git Bash and run:

```bash
cd ~/brum-dashboard-
npm run dev
```

Then open:

```text
http://localhost:3000
```

## Common problems

### The destination folder already exists

You may see:

```text
fatal: destination path 'brum-dashboard-' already exists
```

This normally means the first clone worked. Do not clone it again.

Run:

```bash
cd ~/brum-dashboard-
git status
```

### npm command not found

You may see:

```text
bash: npm: command not found
```

Node.js is either not installed or Git Bash was open during the installation.

Install Node.js LTS, close Git Bash completely, reopen it and check:

```bash
node --version
npm --version
```

### Localhost will not open

The local server must be running.

In Git Bash, enter:

```bash
cd ~/brum-dashboard-
npm run dev
```

Keep Git Bash open and use the exact address it displays. If port 3000 is already occupied, it may provide a different address such as `http://localhost:3001`.

### package.json cannot be found

You are probably in the wrong folder.

Check your location and files:

```bash
pwd
ls
```

Then enter the project folder:

```bash
cd ~/brum-dashboard-
```

## Before changing anything

Read these files in this order:

1. [README.md](README.md)
2. [AGENTS.md](AGENTS.md)
3. [docs/for-builders.md](docs/for-builders.md)
4. [docs/architecture.md](docs/architecture.md)
5. [CLAUDE.md](CLAUDE.md)
6. [package.json](package.json)

`AGENTS.md` contains important rules about official data, provenance, verification and human approval. Read it before making a project change.

## API keys

The ordinary website, dashboards, review screen and sources page should run without API keys.

Some AI features and data collection scripts require additional API keys. Never place an API key directly in a committed file or share it publicly on GitHub.

## Success checklist

You have completed the process when:

* Your fork appears in your GitHub account
* The repository exists on your computer
* `node --version` and `npm --version` work
* `npm install` completes
* `npm run dev` starts the server
* Ask Ozzy opens on localhost
* You know how to stop and restart it

Congratulations. You have successfully forked Ask Ozzy and run it locally.
