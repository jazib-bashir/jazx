# jazx

AI-powered Git workflow assistant for faster commits, smarter reviews, and clearer PRs — directly from your terminal.

> npm package: `jazx-cli`  
> executable command: `jazx`

## Why jazx?

Developers spend significant time:
- writing commit messages
- understanding branch changes
- reviewing code

jazx reduces this friction by bringing AI directly into your Git workflow.

Benefits:
- save time on repetitive tasks
- improve consistency of commits and PRs
- get instant insights on code changes

## How it works

1. Reads your git changes (staged or branch diff)
2. Sends context to AI provider (Groq or OpenAI)
3. Generates structured output:
   - commit messages
   - PR descriptions
   - review insights
   - summaries

## Features

- `commit` command for high-quality commit messages from staged changes
- `pr` command for branch-based PR descriptions (`diff` + commit log context)
- `review` command for risk-focused code review notes
- `summarize` command for concise branch summaries
- Provider support: `groq` (default) and `openai`
- Optional PR checklist appending via `jazx pr --checklist`
- Structured, consistent command output with actionable error messages
- Local config support at `~/.jazx/config.json`

## Table of Contents

- [Why jazx?](#why-jazx)
- [How it works](#how-it-works)
- [Core Commands](#core-commands)
- [Requirements](#requirements)
- [Installation](#installation)
- [Quick Start](#quick-start)
- [Configuration](#configuration)
- [Command Reference](#command-reference)
  - [`jazx commit`](#jazx-commit)
  - [`jazx pr`](#jazx-pr)
  - [`jazx review`](#jazx-review)
  - [`jazx summarize`](#jazx-summarize)
  - [`jazx config`](#jazx-config)
- [Usage Examples](#usage-examples)
- [Example Output](#example-output)
- [Privacy](#privacy)
- [Troubleshooting](#troubleshooting)
- [License](#license)

## Core Commands

- `jazx commit` → generate commit messages
- `jazx pr` → generate PR descriptions
- `jazx review` → analyze changes and risks
- `jazx summarize` → understand branch quickly

## Requirements

- Node.js 18+
- Git installed and available in `PATH`
- API key for selected provider (`groq` or `openai`)

## Installation

### Global install

```bash
npm install -g jazx-cli
```

### Local install

```bash
npm install jazx-cli
npx jazx --help
```

## Quick Start

```bash
npm install -g jazx-cli

jazx config set-provider groq
jazx config set-key <your-key>

git add .
jazx commit --apply
```

## Configuration

`jazx` supports:
- `groq` (model: `llama-3.1-8b-instant`)
- `openai` (model: `gpt-4o-mini`)

Config file location:
- `~/.jazx/config.json`

Example:

```json
{
  "provider": "groq",
  "apiKey": "your_api_key"
}
```

Key resolution order:
1. `~/.jazx/config.json`
2. environment variables (`GROQ_API_KEY`, `OPENAI_API_KEY`)

## Command Reference

### `jazx commit`

Generate commit message from staged changes (`git diff --staged` / `--cached` fallback).

| Option | Description |
| --- | --- |
| `--apply` | Apply generated message via `git commit -m` after confirmation |
| `--type <type>` | Force commit type (`feat`, `fix`, `chore`, etc.) |
| `--conventional` | Enforce conventional commit format |
| `--short` | One-line output only |
| `--detailed` | Title + bullet points |
| `--custom <instruction>` | Additional generation guidance |

Rules:
- default mode is smart (title + optional bullets)
- `--short` and `--detailed` are mutually exclusive

### `jazx pr`

Generate PR description from branch differences.

| Option | Description |
| --- | --- |
| `--from <baseBranch>` | Base branch |
| `--to <targetBranch>` | Target branch |
| `--checklist` | Append static checklist block |

Branch selection:
- if both `--from` and `--to` are provided, they are used directly
- if neither is provided:
  - head = current branch
  - base = `develop` if present, otherwise `main`

Git context used:
- `git diff base...head`
- `git log base..head --oneline`

Output sections:
- `## Summary`
- `## Changes`
- `## Impact`
- `## Notes`

### `jazx review`

Generate review-oriented branch analysis from the same branch context as `pr`.

Options:
- `--from <baseBranch>`
- `--to <targetBranch>`

Output sections:
- `## Potential Issues`
- `## Improvements`
- `## Risk Areas`
- `## Test Suggestions`

### `jazx summarize`

Generate a concise branch summary from diff + commit log context.

Options:
- `--from <baseBranch>`
- `--to <targetBranch>`

Output format:
- one short paragraph
- bullet points of key changes

### `jazx config`

Manage provider and API key.

| Command | Description |
| --- | --- |
| `jazx config set-provider <provider>` | Set provider (`groq` or `openai`) |
| `jazx config set-key <apiKey>` | Save API key locally |

## Usage Examples

```bash
# Commit generation
jazx commit --conventional --short
jazx commit --type feat --detailed
jazx commit --short --custom "imperative tone"
jazx commit --apply

# PR generation
jazx pr
jazx pr --from develop --to feature/my-change
jazx pr --checklist
jazx pr --from main --to feature/my-change --checklist

# Review and summarize
jazx review --from main --to feature/my-change
jazx summarize --from main --to feature/my-change
```

## Example Output

### Commit example

```text
feat(auth): add token refresh validation
```

### PR example

```text
## Summary
Add token refresh handling and tighten auth middleware checks.

## Changes
- implement refresh token verification flow
- update middleware validation and error responses

## Impact
Improves session reliability and auth safety.

## Notes
No database schema changes.
```

### Review example

```text
## Potential Issues
- refresh token edge cases may fail if token clock skew is high

## Improvements
- add explicit tests for expired and malformed refresh tokens

## Risk Areas
- auth middleware and session lifecycle handling

## Test Suggestions
- run auth integration tests and manual session expiry checks
```

### Summary example

```text
This branch strengthens authentication reliability and improves error handling around token refresh.

- add refresh token validation in middleware
- improve expired-session handling paths
- update auth-related tests for edge cases
```

## Privacy

jazx sends git diffs and commit context to the configured AI provider (Groq or OpenAI).

Avoid using with sensitive or confidential code unless you trust the provider.

## Troubleshooting

- **No API key found**
  - run: `jazx config set-key <your-key>`
  - or export `GROQ_API_KEY` / `OPENAI_API_KEY`

- **No staged changes found (commit)**
  - stage files: `git add <files>`

- **Invalid branch options**
  - provide both `--from` and `--to`, or neither

- **No branch changes found**
  - verify branch range and commits between base and target

- **Same base and target branch**
  - use explicit different branches, for example:  
    `jazx pr --from main --to feature/my-branch`

## License

ISC
