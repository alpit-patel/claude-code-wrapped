import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { analyze, findTranscriptFiles, personality } from '../src/analyze.mjs';
import { renderHtml } from '../src/render.mjs';
import { demoStats } from '../src/demo.mjs';

const mk = () => {
  const dir = mkdtempSync(join(tmpdir(), 'cw-'));
  const L = [
    { type: 'user', timestamp: '2026-03-01T01:10:00Z', sessionId: 's1', cwd: '/a/proj', message: { role: 'user', content: 'please fix this bug, thanks' } },
    { type: 'assistant', timestamp: '2026-03-01T01:11:00Z', sessionId: 's1', requestId: 'r1', message: { id: 'm1', model: 'claude-x', usage: { input_tokens: 10, output_tokens: 20 }, content: [{ type: 'tool_use', name: 'Edit', input: { file_path: '/a/proj/x.js' } }] } },
    { type: 'assistant', timestamp: '2026-03-01T01:11:01Z', sessionId: 's1', requestId: 'r1', message: { id: 'm1', model: 'claude-x', usage: { input_tokens: 10, output_tokens: 20 }, content: [] } },
    { type: 'user', timestamp: '2026-03-01T01:12:00Z', sessionId: 's1', message: { role: 'user', content: [{ type: 'tool_result', content: 'ok' }] } },
    { type: 'user', timestamp: '2026-03-02T10:00:00Z', sessionId: 's1', message: { role: 'user', content: '<system-reminder>x</system-reminder>' } },
    { type: 'user', timestamp: '2025-01-01T10:00:00Z', sessionId: 's0', message: { role: 'user', content: 'old year' } },
  ];
  writeFileSync(join(dir, 'a.jsonl'), L.map((l) => JSON.stringify(l)).join('\n') + '\nnot json\n');
  return dir;
};

test('analyzes transcripts, dedupes messages, filters year and noise', async () => {
  const st = await analyze(findTranscriptFiles(mk()), { year: 2026 });
  assert.equal(st.totals.prompts, 1);
  assert.equal(st.manners.please, 1);
  assert.equal(st.manners.thanks, 1);
  assert.equal(st.totals.outputTokens, 20);
  assert.equal(st.totals.filesEdited, 1);
  assert.equal(st.manners.nightPrompts, 1);
});

test('renders html without leaking prompt text', () => {
  const st = demoStats(2026);
  const html = renderHtml(st);
  assert.ok(html.includes('Claude Wrapped'));
  assert.ok(!html.includes(st.longestPrompt.preview));
  assert.ok(!html.includes('claude-wrapped</span>'));
});

test('personality returns a name', () => assert.ok(personality(demoStats()).name));

test('computes languages, heatmap data and achievements', async () => {
  const st = await analyze(findTranscriptFiles(mk()), { year: 2026 });
  assert.deepEqual(st.topLanguages[0], ['JavaScript', 1]);
  assert.equal(st.daily['2026-03-01'], 1);
  assert.ok(Array.isArray(st.achievements));
  assert.ok(renderHtml(demoStats(2026)).includes('Badges unlocked'));
});

test('handles Windows paths, empty dirs and bad lines', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'cw-'));
  writeFileSync(join(dir, 'w.jsonl'), [
    JSON.stringify({ type: 'user', timestamp: '2026-05-05T12:00:00Z', sessionId: 'w', cwd: 'C:\\Users\\me\\proj', message: { role: 'user', content: 'hello' } }),
    JSON.stringify({ type: 'assistant', timestamp: '2026-05-05T12:00:05Z', sessionId: 'w', message: { id: 'a', content: [{ type: 'tool_use', name: 'Write', input: { file_path: 'C:\\Users\\me\\proj\\a.py' } }] } }),
    '{broken', '', 'null',
  ].join('\r\n'));
  const st = await analyze(findTranscriptFiles(dir), { year: 2026 });
  assert.equal(st.totals.prompts, 1);
  assert.equal(st.topProjects[0][0], 'proj');
  assert.equal(st.topFile.name, 'proj/a.py');
  const empty = await analyze([], { year: 2026 });
  assert.equal(empty.totals.prompts, 0);
  assert.ok(renderHtml(empty).includes('Claude Wrapped'));
});

test('escapes hostile text in html', async () => {
  const st = demoStats(2026);
  st.topWords = [['<script>alert(1)</script>', 3]];
  st.topTools = [['"><img src=x onerror=alert(1)>', 1]];
  const html = renderHtml(st);
  assert.ok(!html.includes('<script>alert(1)'));
  assert.ok(!html.includes('<img src=x'));
});
