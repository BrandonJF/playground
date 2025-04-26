# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build Commands
- Install dependencies: `pnpm install`
- Start development server: `pnpm dev`
- Build for production: `pnpm build`
- Run tests: `pnpm test`
- Run a single test: `pnpm test -- -t "test name"`
- Lint code: `pnpm lint`
- Type check: `pnpm typecheck`

## Code Style Guidelines
- Use ESLint and Prettier for formatting
- Prefer TypeScript over JavaScript
- Use named exports over default exports
- Follow kebab-case for filenames, PascalCase for components
- Organize imports: React first, then external libs, then internal modules
- Use async/await instead of Promises
- Handle errors with try/catch blocks
- Document public functions with JSDoc comments
- Use functional components with React hooks