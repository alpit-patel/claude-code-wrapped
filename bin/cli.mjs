#!/usr/bin/env node
import { writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join, resolve } from 'node:path';
import { exec } from 'node:child_process';
import { analyze, findTranscriptFiles } from '../src/analyze.mjs';
import { renderHtml } from '../src/render.mjs';
import { demoStats } from '../src/demo.mjs';

const args = process.argv.slice(2);
const flag = (n) => args.includes(n);
const val = (n, d) => { const i = args.indexOf(n); return i >= 0 && args[i + 1] ? args[i + 1] : d; };

if (flag('--help') || flag('-h')) {
  console.log(`claude-wrapped: your Claude Code year, Spotify-Wrapped style.

Usage: npx claude-wrapped [options]
  --year <YYYY>   year to summarize (default: current year)
  --dir <path>    transcripts folder (default: ~/.claude/projects)
  --out <file>    output html (default: ./claude-wrapped-<year>.html)
  --demo          preview with fake data
  --json          print raw stats instead of writing html
  --no-open       do not open the browser

Runs 100% locally. Nothing is uploaded.`);
  process.exit(0);
}

const year = Number(val('--year', new Date().getFullYear()));
let st;
if (flag('--demo')) st = demoStats(year);
else {
  const dir = resolve(val('--dir', join(homedir(), '.claude', 'projects')));
  const files = findTranscriptFiles(dir);
  if (!files.length) { console.error(`No Claude Code transcripts found in ${dir}.\nTry --demo to preview.`); process.exit(1); }
  st = analyze(files, { year });
  if (!st.totals.prompts) { console.error(`No prompts found for ${year} in ${files.length} files. Try --year ${year - 1}.`); process.exit(1); }
}

if (flag('--json')) { console.log(JSON.stringify(st, null, 2)); process.exit(0); }
const out = resolve(val('--out', `claude-wrapped-${year}.html`));
writeFileSync(out, renderHtml(st));
console.log(`Done. ${st.totals.prompts.toLocaleString()} prompts, ${st.totals.sessions} sessions.\nOpen: ${out}`);
if (!flag('--no-open')) {
  const cmd = process.platform === 'darwin' ? 'open' : process.platform === 'win32' ? 'start ""' : 'xdg-open';
  exec(`${cmd} "${out}"`, () => {});
}
