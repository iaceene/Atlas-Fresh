# Getting Started

This project is built with [Bun](https://bun.sh/), a fast all-in-one JavaScript runtime and package manager.

## Prerequisites

Make sure Bun is installed on your system.

### Install Bun

```bash
$> curl -fsSL https://bun.sh/install | bash
```

After installation, restart your terminal or reload your shell configuration if needed.

## Installation

Clone the repository and install the project dependencies:

```bash
$> bun install
```

## Development

Start the development server:

```bash
$> bun run dev
```

## Linting

Run the linter to check the codebase for potential issues:

```bash
$> bun run lint
```

## Production

Build the project for production:

```bash
$> bun run build
```

Then start the production server:

```bash
$> bun run start
```

### Available Commands

| Command         | Description                      |
| --------------- | -------------------------------- |
| `bun install`   | Install dependencies             |
| `bun run dev`   | Start the development server     |
| `bun run lint`  | Run the linter                   |
| `bun run build` | Build the project for production |
| `bun run start` | Start the production server      |
