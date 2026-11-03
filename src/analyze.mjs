// Reads Claude Code transcripts (~/.claude/projects/**/*.jsonl) and computes stats.
// Everything stays on the local machine. Nothing is uploaded.
import { readdirSync, createReadStream } from 'node:fs';
import { createInterface } from 'node:readline';
import { join, basename } from 'node:path';

const STOP = new Set(('the a an and or but if then so to of in on at for with from by is are was were be been it its this that these those ' +
  'i you we they he she me my your our can could would should will just do does did not no yes ok okay now what how why when where which ' +
  'there here also as about into out up down over than too very more some any all have has had get got make let use using want need like ' +
  'please thanks thank claude file files code one two new add').split(' '));

const LANGS = { js: 'JavaScript', mjs: 'JavaScript', cjs: 'JavaScript', jsx: 'JavaScript', ts: 'TypeScript', tsx: 'TypeScript', py: 'Python', go: 'Go', rs: 'Rust',
  rb: 'Ruby', java: 'Java', kt: 'Kotlin', swift: 'Swift', php: 'PHP', c: 'C', h: 'C', cpp: 'C++', cs: 'C#', html: 'HTML', css: 'CSS', scss: 'CSS',
  astro: 'Astro', vue: 'Vue', svelte: 'Svelte', md: 'Markdown', mdx: 'Markdown', json: 'JSON', yml: 'YAML', yaml: 'YAML', sh: 'Shell', sql: 'SQL' };

export function findTranscriptFiles(root) {
  const out = [];
  const walk = (dir) => {
    let entries;
    try { entries = readdirSync(dir, { withFileTypes: true }); } catch { return; }
    for (const e of entries) {
      const p = join(dir, e.name);
      if (e.isDirectory()) walk(p);
      else if (e.name.endsWith('.jsonl')) out.push(p);
    }
  };
  walk(root);
  return out;
}

function userText(msg) {
  const c = msg?.content;
  if (typeof c === 'string') return c;
  if (!Array.isArray(c)) return '';
  // tool results are not human prompts
  return c.filter((b) => b?.type === 'text').map((b) => b.text).join('\n');
}

const isNoise = (t) =>
  !t || t.startsWith('<system-reminder>') || t.startsWith('<command-') || t.startsWith('<local-command') ||
  t.startsWith('Caveat:') || t.startsWith('[Request interrupted');

const count = (s, re) => (s.match(re) || []).length;

export async function analyze(files, { year = new Date().getFullYear() } = {}) {
  const sessions = new Map(); // id -> {first,last,prompts,project}
  const seenMsg = new Set();
  const days = new Map();
  const hours = new Array(24).fill(0);
  const weekdays = new Array(7).fill(0);
  const tools = new Map();
  const models = new Map();
  const edited = new Map();
  const langs = new Map();
  const projects = new Map();
  const words = new Map();
  const prompts = []; // {text, ts}
  const tok = { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 };
  let please = 0, thanks = 0, caps = 0, questions = 0, sorry = 0, swears = 0, promptChars = 0;
  let nightPrompts = 0, interrupts = 0, errorsFixed = 0;

  for (const file of files) {
    let rl;
    try { rl = createInterface({ input: createReadStream(file, { encoding: 'utf8' }), crlfDelay: Infinity }); } catch { continue; }
    try {
    for await (const line of rl) {
      if (!line) continue;
      let o;
      try { o = JSON.parse(line); } catch { continue; }
      if (!o.timestamp || (o.type !== 'user' && o.type !== 'assistant')) continue;
      const d = new Date(o.timestamp);
      if (Number.isNaN(+d) || d.getFullYear() !== year) continue;
      const sid = o.sessionId || basename(file, '.jsonl');
      const s = sessions.get(sid) || { first: +d, last: +d, prompts: 0, project: o.cwd || '' };
      s.first = Math.min(s.first, +d); s.last = Math.max(s.last, +d);
      if (o.cwd) s.project = o.cwd;
      sessions.set(sid, s);

      if (o.type === 'assistant' && o.message) {
        const key = (o.message.id || o.uuid) + ':' + (o.requestId || '');
        if (seenMsg.has(key)) continue;
        seenMsg.add(key);
        const u = o.message.usage || {};
        tok.input += u.input_tokens || 0;
        tok.output += u.output_tokens || 0;
        tok.cacheRead += u.cache_read_input_tokens || 0;
        tok.cacheWrite += u.cache_creation_input_tokens || 0;
        const m = o.message.model;
        if (m && m !== '<synthetic>') models.set(m, (models.get(m) || 0) + 1);
        for (const b of Array.isArray(o.message.content) ? o.message.content : []) {
          if (b?.type !== 'tool_use') continue;
          tools.set(b.name, (tools.get(b.name) || 0) + 1);
          const fp = b.input?.file_path;
          if (fp && ['Edit', 'Write', 'MultiEdit'].includes(b.name)) {
            edited.set(fp, (edited.get(fp) || 0) + 1);
            const l = LANGS[fp.split('.').pop().toLowerCase()];
            if (l) langs.set(l, (langs.get(l) || 0) + 1);
          }
        }
        continue;
      }

      // user
      if (o.isSidechain || o.isMeta) continue;
      if (o.origin?.kind && o.origin.kind !== 'human') continue;
      const text = userText(o.message).trim();
      if (isNoise(text)) continue;
      if (text.startsWith('[Request interrupted')) { interrupts++; continue; }

      s.prompts++;
      const dk = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      days.set(dk, (days.get(dk) || 0) + 1);
      hours[d.getHours()]++;
      weekdays[d.getDay()]++;
      if (d.getHours() < 5) nightPrompts++;
      const pj = s.project || 'unknown';
      projects.set(pj, (projects.get(pj) || 0) + 1);
      promptChars += text.length;
      prompts.push({ text, ts: o.timestamp });

      const low = text.toLowerCase();
      please += count(low, /\bplease\b|\bplz\b/g);
      thanks += count(low, /\bthanks?\b|\bthank you\b|\bthx\b/g);
      sorry += count(low, /\bsorry\b|\boops\b/g);
      swears += count(low, /\b(damn|wtf|shit|fuck\w*|crap|ffs)\b/g);
      questions += count(text, /\?/g);
      caps += count(text, /\b[A-Z]{4,}\b/g);
      if (/\b(fix|bug|error|broken|crash|fails?|failing)\b/.test(low)) errorsFixed++;
      for (const w of low.replace(/https?:\/\/\S+/g, ' ').match(/[a-z][a-z'-]{3,}/g) || []) {
        if (!STOP.has(w)) words.set(w, (words.get(w) || 0) + 1);
      }
    }
    } catch { /* unreadable file: skip */ }
  }

  const top = (m, n) => [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, n);
  const sessionList = [...sessions.values()].filter((s) => s.prompts > 0);
  const longest = sessionList.reduce((a, s) => (s.last - s.first > (a?.last - a?.first || 0) ? s : a), null);
  const dayKeys = [...days.keys()].sort();

  // longest streak of consecutive active days
  let streak = 0, best = 0, prev = null;
  for (const k of dayKeys) {
    const t = Date.parse(k + 'T00:00:00Z');
    streak = prev !== null && t - prev === 86400000 ? streak + 1 : 1;
    best = Math.max(best, streak);
    prev = t;
  }
  const busiest = top(days, 1)[0] || null;
  const longestPrompt = prompts.reduce((a, p) => (p.text.length > (a?.text.length || 0) ? p : a), null);
  const shortestPrompts = prompts.filter((p) => p.text.length > 0 && p.text.length <= 12);
  const peakHour = hours.indexOf(Math.max(...hours));
  const topFile = top(edited, 1)[0] || null;

  const daily = Object.fromEntries(days);
  const result = {
    year,
    daily,
    topLanguages: top(langs, 5),
    totals: {
      prompts: prompts.length,
      sessions: sessionList.length,
      activeDays: days.size,
      hoursWithClaude: Math.round(sessionList.reduce((a, s) => a + Math.min(s.last - s.first, 6 * 3600e3), 0) / 3600e3),
      tokens: tok.input + tok.output + tok.cacheRead + tok.cacheWrite,
      outputTokens: tok.output,
      inputTokens: tok.input,
      cacheTokens: tok.cacheRead + tok.cacheWrite,
      toolCalls: [...tools.values()].reduce((a, b) => a + b, 0),
      filesEdited: edited.size,
      projects: projects.size,
    },
    manners: { please, thanks, sorry, swears, caps, questions, interrupts, nightPrompts, bugPrompts: errorsFixed },
    rhythm: { hours, weekdays, peakHour, busiestDay: busiest ? { date: busiest[0], prompts: busiest[1] } : null, longestStreak: best },
    topTools: top(tools, 5),
    topModels: top(models, 3),
    topProjects: top(projects, 5).map(([p, n]) => [p.split(/[\\/]/).filter(Boolean).pop() || p, n]),
    topWords: top(words, 8),
    topFile: topFile ? { name: topFile[0].split(/[\\/]/).slice(-2).join('/'), edits: topFile[1] } : null,
    longestSession: longest ? { hours: Math.round(((longest.last - longest.first) / 3600e3) * 10) / 10, prompts: longest.prompts } : null,
    longestPrompt: longestPrompt ? { chars: longestPrompt.text.length, preview: longestPrompt.text.slice(0, 140) } : null,
    avgPromptChars: prompts.length ? Math.round(promptChars / prompts.length) : 0,
    shortPrompts: shortestPrompts.length,
  };
  result.achievements = achievements(result);
  return result;
}

export function achievements(st) {
  const t = st.totals, m = st.manners, r = st.rhythm;
  const all = [
    [t.prompts >= 1000, 'Four Digits', '1,000+ prompts'],
    [t.activeDays >= 100, 'Regular', '100+ active days'],
    [r.longestStreak >= 7, 'On a Roll', '7+ day streak'],
    [(st.longestSession?.hours || 0) >= 5, 'Marathoner', 'a session over 5 hours'],
    [m.please >= 100, 'Polite Human', 'said please 100+ times'],
    [m.nightPrompts >= 100, 'Night Owl', '100+ prompts after midnight'],
    [t.projects >= 10, 'Multitasker', '10+ projects'],
    [t.filesEdited >= 500, 'File Wrecker', '500+ files edited'],
    [t.tokens >= 1e9, 'Billionaire', '1B+ tokens'],
    [(st.topLanguages || []).length >= 4, 'Polyglot', '4+ languages'],
    [m.interrupts >= 50, 'Backseat Driver', 'hit stop 50+ times'],
  ];
  return all.filter((a) => a[0]).map(([, name, why]) => ({ name, why }));
}

export function personality(st) {
  const t = st.totals, m = st.manners, r = st.rhythm;
  const per = Math.max(t.prompts, 1);
  if (m.swears / per > 0.03) return { emoji: '🐯', name: 'The Pressure Cooker', blurb: 'You and Claude have been through it. It still shows up every time.' };
  if (m.nightPrompts / per > 0.2) return { emoji: '🦉', name: 'The Night Owl', blurb: 'Your best code happens after midnight. Claude never asks you to go to bed.' };
  if (m.please / per > 0.2) return { emoji: '🎩', name: 'The Gentleman', blurb: 'Polite to a fault. When the robots take over, you are safe.' };
  if (st.avgPromptChars > 600) return { emoji: '🏗️', name: 'The Architect', blurb: 'Long, careful briefs. Claude always knows exactly what you want.' };
  if (st.avgPromptChars < 80) return { emoji: '🐱', name: 'The Minimalist', blurb: 'A few words, one command. Claude reads your mind.' };
  if (r.longestStreak >= 14) return { emoji: '🔥', name: 'The Streaker', blurb: 'Showing up day after day. Consistency is the real superpower.' };
  return { emoji: '🐶', name: 'The Good Boy Builder', blurb: 'You ship. Claude fetches. Everybody wins.' };
}
