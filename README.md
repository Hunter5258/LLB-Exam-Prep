# LL.B. Study & Revision

A syllabus-first study and revision platform for LL.B. students, built with React, TypeScript and Vite. Content is stored locally (IndexedDB via Dexie); there is no backend.

## Setup

```bash
npm install
npm run dev
```

## Scripts

- `npm run dev` — start the dev server
- `npm run build` — type-check and build to `dist/`
- `npm run preview` — preview the production build
- `npm run content:build` — regenerate `src/content/generated/content.json` from the Markdown in `src/content/documents`
- `npm test` — run tests
- `npm run lint` — run ESLint

## Content

Edit the Markdown under `src/content/documents/`, then run `npm run content:build` before building. `src/content/index.ts` imports both the generated JSON and the Markdown files directly, so both are committed.
