# Claude Wrapped

Your Claude Code year, Spotify-Wrapped style. One command, one shareable card.

<img src="docs/card.png" width="360" alt="Claude Wrapped share card">

```bash
npx claude-wrapped          # reads ~/.claude/projects, opens your story
npx claude-wrapped --demo   # preview with fake data
```

## What you get
- Prompts, sessions, active days, best streak
- Tokens moved (in "copies of War and Peace")
- How many times you said please, thanks, and swore
- Your peak hour, busiest day, night-owl score
- Top tools, most-edited file, favorite words
- A personality (Builder, Night Owl, Gentleman, Architect, Minimalist, Streaker, Pressure Cooker)
- A 1080x1350 PNG share card

## Privacy
Runs 100% on your machine. Zero dependencies, no network calls. The share card and caption contain
only totals: no prompt text, no project names.

## Options
`--year 2025`, `--dir <path>`, `--out file.html`, `--json`, `--no-open`

## Develop
```bash
npm test
npm run demo
```

MIT
