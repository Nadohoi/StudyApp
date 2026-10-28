# StudyApp — MCQ Spaced Repetition

A browser-based spaced-repetition study app for multiple-choice questions. Import a question bank from CSV, JSON, or PDF, then review it with an SM-2 scheduler.

Everything runs client-side. There is no backend, no account, and no network traffic — your questions and review history are stored in your browser's `localStorage`.

**Live app:** https://<your-username>.github.io/StudyApp/

## Features

- **Import** question banks from CSV, JSON, or PDF
- **SM-2 scheduling** — questions resurface based on how well you knew them
- **Daily limits** — configurable caps on new cards and reviews per day
- **Stats and history** — accuracy, streaks, and per-question review logs
- **Backup and restore** — export your full state to JSON and load it back later
- **Offline-friendly** — once loaded, no network requests are made

## Local development

Requires Node.js 20 or newer.

```bash
npm install
npm run dev      # start the dev server at http://localhost:5173
npm run build    # type-check and build to dist/
npm run preview  # serve the production build locally
```

## Import formats

### CSV

Header row required. Columns: `question`, `optionA`, `optionB`, `optionC`, `optionD`, `correct`, `explanation`, `topic`.

`correct` accepts a letter (`A`–`D`) or a 1-based index (`1`–`4`). Questions may have 2–4 options; leave trailing option columns empty to use fewer.

```csv
question,optionA,optionB,optionC,optionD,correct,explanation,topic
"What is the capital of France?","Berlin","Madrid","Paris","Rome",C,"Paris is the capital of France.","Geography"
```

See [`sample-questions.csv`](sample-questions.csv) for a complete example.

### JSON

An array of question objects, or an object with a `questions` array. See [`sample-questions.json`](sample-questions.json).

### PDF

Text-based PDFs (not scanned images) using this layout:

```
<topic title>
（共 300 題）
1/37
1、Question text
A. Option
B. Option*
C. Option
```

The `*` marks the correct answer. Questions without a detected answer are flagged for manual review in the import preview before you commit them.

## Deployment

The site deploys automatically to GitHub Pages via GitHub Actions on every push to `main`.

One-time setup in the repository:

1. Go to **Settings → Pages**
2. Under **Build and deployment → Source**, select **GitHub Actions**

The workflow in [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml) builds the app and publishes `dist/`.

### Base path

Because the site is served from a subpath, [`vite.config.ts`](vite.config.ts) sets:

```ts
base: '/StudyApp/'
```

This must match the repository name exactly. If you rename the repo, update this value or the deployed page will load with broken asset URLs.

## Project structure

```
src/
  App.tsx              top-level state and view routing
  components/          Import, Study, Stats, History, Settings views
  lib/
    parser.ts          CSV and JSON parsing
    pdfParser.ts       PDF text extraction and question parsing
    sm2.ts             SM-2 scheduling algorithm
    queue.ts           due/new question queue building
    storage.ts         localStorage persistence and backup
```

## License

MIT
