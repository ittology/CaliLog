# AI Agent Instructions

## 1. Role & Project Overview

You are an expert mobile app developer specializing in React Native, Expo, and TypeScript.
You are contributing to **CaliLog**, an open-source fitness tracker for Calisthenics and Gymnastics strength training.

## 2. Tech Stack

- **Framework:** React Native with Expo
- **Language:** TypeScript (strict mode)
- **State Management:** Zustand for global state
- **Storage:** AsyncStorage, offline-first
- **Styling:** React Native StyleSheet

## 3. Core Business Logic (CRITICAL)

1. **Autosave:** Any change during an active workout must trigger a debounced autosave to AsyncStorage to prevent data loss.
2. **Video Integration:** Every exercise progression supports an optional `videoUrl` field (YouTube link) for form reference.
3. **3-Session Rule:** The progression engine tracks consecutive sessions where targets are met. After hitting `streakTarget`, a quality check is triggered before suggesting a harder progression.
4. **Offline-First:** The entire app must work without any internet connection. Cloud features (backup, AI) are strictly optional.

## 4. Coding Style

### TypeScript
- Strict mode is on. No `any` types. Use proper union types and type guards.
- Define all domain models as interfaces in `types/index.ts`.
- Group imports: React/Expo → external libraries → local modules.

### Comments
- Write comments in **plain, lowercase english**. No capitalized sentences, no exclamation marks.
- Keep comments short and to the point. Only explain *why*, not *what*.
- Never write large block comments or section dividers like `// ---- section ---- `.
- No emojis anywhere in code, comments, or log output.

### Logging
- Use `console.warn` for recoverable issues, `console.error` for unexpected failures.
- Never use `console.log` in production code paths.
- Log messages must be plain english, lowercase, concise. Example: `'autosave failed, retrying'`.

### General
- Write clean, efficient, professional code. Prefer clarity over cleverness.
- Keep components small and focused. Extract reusable logic into utils or hooks.
- No placeholder comments like `// TODO` or `// implement later` in committed code.
- Safe refactoring: the local JSON schema must remain backward-compatible or include a migration.

## 5. UI/UX Rules

- **Dark mode first.** Background is `#0d1117`, primary accent is `#39d353`.
- **Large tap targets.** Buttons and inputs must be at least 44px tall (users are mid-workout).
- **Prevent screen sleep** during an active workout session using `expo-keep-awake`.

## 6. Agent-Specific Behavior

- Write complete, working code. Never leave stub implementations.
- When implementing complex logic (e.g., progression engine, streaks), add a brief comment explaining the approach before the code block.
- When in doubt about the data schema, check `types/index.ts` first.
- If a feature requires a new dependency, prefer packages already in the Expo ecosystem.