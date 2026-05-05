# jazx

AI-powered Git workflow CLI for commit messages, PR descriptions, review insights, and branch summaries.

> npm package: `jazx-cli`  
> executable command: `jazx`

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
- [Troubleshooting](#troubleshooting)
- [License](#license)

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
# 1) Configure provider and key (one-time)
jazx config set-provider groq
jazx config set-key <your-key>

# 2) Generate a commit message
jazx commit --conventional --short

# 3) Generate a PR description from branch changes
jazx pr --from main --to feature/my-branch --checklist
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
