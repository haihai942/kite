# AGENTS.md

Instructions for AI coding agents working in this repository. Cline, VS Code agent mode, and most other tools read this file automatically. Students: read it too. These are the rules your AI partner is being held to, and they are the same rules you are graded against.

## What this project is

One student's Khmer Living Archive, built in ICT 340 at AUPP. Every student builds the same four-feature skeleton (browse and search, contributor accounts, own-your-entries, submit-review-publish) around their own collection of Khmer culture. Features arrive in three sprints. Build only what the current task asks for; do not build ahead.

## Stack facts

- Next.js 15, App Router, React 19.
- JavaScript only. No TypeScript, no .ts or .tsx files, ever.
- Plain React. No CSS frameworks, no component libraries, no state libraries.
- Styling follows the existing pattern: inline style objects (see `app/page.js`) or a plain CSS file.
- `collection.config.js` is the single source of the archive's identity (name, description, curator, source). Read from it; never hard-code those values.

## Hard rules

1. Do not add dependencies. The three in `package.json` are the whole list. If a task seems to need a package, stop and say so instead of installing it.
2. Do not touch `package.json`, `package-lock.json`, `next.config.mjs`, or `.gitignore` unless the task explicitly names them.
3. Never write an API key, token, or password into any file. This repository is public.
4. Keep diffs scoped to what was asked. If completing the task honestly requires touching another file, say which file and why before editing it.
5. One component per file in `components/`, plain function components, roughly 80 lines or less. If a component wants to be bigger, split it.
6. Khmer text is first-class content, not an edge case. Never strip, transliterate, or "fix" it. Sample data comes from the student's real entries, never lorem ipsum.

## Working style

- For anything beyond a one-file change, state a short plan before writing code.
- Explain changes plainly. The student must be able to defend every line in a code review; write code and explanations that make that possible.
- The student reviews and approves every diff. Expect rejections and make them easy: small steps, clear boundaries.
