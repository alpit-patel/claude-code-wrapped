#!/usr/bin/env node
import { writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawn } from 'node:child_process';
import { analyze, findTranscriptFiles } from '../src/analyze.mjs';
import { renderHtml } from '../src/render.mjs';
import { demoStats } from '../src/demo.mjs';

const args = process.argv.slice(2);
const flag = (n) => args.includes(n);
const val = (n, d) => { const i = args.indexOf(n); return i >= 0 && args[i + 1] ? args[i + 1] : d; };

if (flag('--help') || flag('-h')) {
  console.log(`claude-year-wrapped: your Claude Code year, Spotify-Wrapped style.

Usage: npx claude-year-wrapped [options]
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
if (!Number.isInteger(year) || year < 2023 || year > 2100) { console.error('Invalid --year. Example: --year 2025'); process.exit(1); }
let st;
if (flag('--demo')) st = demoStats(year);
else {
  const base = process.env.CLAUDE_CONFIG_DIR || join(homedir(), '.claude');
  const dir = resolve(val('--dir', join(base, 'projects')));
  const files = findTranscriptFiles(dir);
  if (!files.length) { console.error(`No Claude Code transcripts found in ${dir}.\nTry --demo to preview.`); process.exit(1); }
  st = await analyze(files, { year });
  if (!st.totals.prompts) {
    const now = new Date().getFullYear();
    const hint = year > now ? `${year} has not happened yet. Try --year ${now}.` : `Try --year ${year - 1}, or --demo to preview.`;
    console.error(`No prompts found for ${year} in ${files.length} files. ${hint}`);
    process.exit(1);
  }
}

if (flag('--json')) { console.log(JSON.stringify(st, null, 2)); process.exit(0); }
const out = resolve(val('--out', `claude-wrapped-${year}.html`));
writeFileSync(out, renderHtml(st));
console.log(`Done. ${st.totals.prompts.toLocaleString()} prompts, ${st.totals.sessions} sessions.\nOpen: ${out}`);
if (!flag('--no-open')) {
  // Never pass user-controlled text through a shell. Windows can map .html to a text editor, so try Edge first.
  const run = (cmd, a, onFail) => {
    try {
      const c = spawn(cmd, a, { stdio: 'ignore', detached: true, windowsHide: true });
      c.on('error', () => onFail && onFail());
      c.unref();
    } catch { onFail && onFail(); }
  };
  if (process.platform === 'win32') {
    const safe = !/[&|<>^%"]/.test(out);
    if (safe) run('cmd.exe', ['/c', 'start', '""', 'msedge', `"${out}"`], () => run('cmd.exe', ['/c', 'start', '""', `"${out}"`]));
  } else run(process.platform === 'darwin' ? 'open' : 'xdg-open', [out]);
  console.log('If it opens as code, open the file in your browser instead.');
}
