import { personality } from './analyze.mjs';

const safeJson = (o) => JSON.stringify(o).replace(/</g, '\\u003c').replace(/[\u2028\u2029]/g, '');
const fmt = (n) => Number(n).toLocaleString('en-US');
const compact = (n) => (n >= 1e9 ? (n / 1e9).toFixed(1) + 'B' : n >= 1e6 ? (n / 1e6).toFixed(1) + 'M' : n >= 1e3 ? (n / 1e3).toFixed(1) + 'K' : String(n));
const hour = (h) => (h % 12 || 12) + (h < 12 ? 'am' : 'pm');
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const hourEmoji = (h) => (h < 5 ? '🦉' : h < 11 ? '🌅' : h < 17 ? '☕' : h < 21 ? '🌆' : '🌙');

function bars(h, pk) { const m = Math.max(...h, 1); return h.map((v, i) => `<i class="${i === pk ? 'pk' : ''}" style="height:${Math.max(3, (v / m) * 100)}%"></i>`).join(''); }
function heat(st) {
  const y = st.year, start = new Date(Date.UTC(y, 0, 1)), cells = [];
  for (let i = 0; i < start.getUTCDay(); i++) cells.push('<i style="visibility:hidden"></i>');
  const mx = Math.max(1, ...Object.values(st.daily || {}));
  for (let d = start; d.getUTCFullYear() === y; d = new Date(+d + 864e5)) {
    const k = d.toISOString().slice(0, 10), n = (st.daily || {})[k] || 0;
    const l = !n ? 0 : Math.min(4, 1 + Math.floor((n / mx) * 3.99));
    cells.push(`<i data-l="${l}" title="${k}: ${n}"></i>`);
  }
  return cells.join('');
}

// Self-contained HTML: Apple-style story + canvas share card (PNG). No network, no deps.
export function renderHtml(st) {
  const p = personality(st);
  const data = { st: { ...st, longestPrompt: undefined, topProjects: undefined, daily: undefined, topFile: undefined, topWords: undefined }, p };
  const T = st.totals, M = st.manners, R = st.rhythm;
  const slide = (id, theme, emoji, kicker, body) =>
    `<section id="${id}" class="${theme}"><div class="emo" aria-hidden="true">${emoji}</div><div class="wrap"><div class="k rv">${kicker}</div>${body}</div></section>`;

  const slides = [
    slide('s0', 'th-o', '👋', 'Claude Wrapped ' + st.year, `<h1 class="rv">Your ${st.year} with <span class="grad">Claude Code</span></h1><p class="sub rv">Computed on your machine. Nothing leaves it. Scroll to see how it went. 🐾</p>`),
    slide('s1', 'th-y', '🗣️', 'You talked. Claude listened.', `<div class="big rv grad" data-n="${T.prompts}">0</div><p class="sub rv">prompts across <b>${fmt(T.sessions)}</b> sessions on <b>${fmt(T.activeDays)}</b> days. That is a lot of chatting with a robot.</p>
      <div class="cards rv"><div class="card"><b>${fmt(T.hoursWithClaude)}h</b><span>🤝 side by side</span></div><div class="card"><b>${fmt(T.projects)}</b><span>📁 projects</span></div><div class="card"><b>${fmt(R.longestStreak)}</b><span>🔥 day streak</span></div></div>`),
    slide('s2', 'th-g', '📚', 'Tokens', `<div class="big rv grad">${compact(T.tokens)}</div><p class="sub rv">tokens moved. About <b>${fmt(Math.round(T.tokens / 750000))}</b> copies of <i>War and Peace</i>. Claude fetched <b>${compact(T.outputTokens)}</b> of them like a good dog. 🐕</p>
      <div class="cards rv"><div class="card"><b>${fmt(T.toolCalls)}</b><span>🛠️ tool calls</span></div><div class="card"><b>${fmt(T.filesEdited)}</b><span>📝 files edited</span></div></div>`),
    slide('s3', 'th-p', '🙏', 'Manners', `<div class="big rv grad" data-n="${M.please}">0</div><p class="sub rv">times you said <b>please</b>. Thanks came up ${fmt(M.thanks)} times. ${M.swears ? `You swore <b>${fmt(M.swears)}</b> times 🤬. Claude will not tell.` : 'Not one swear word. Saint. 😇'}</p>
      <div class="cards rv"><div class="card"><b>${fmt(M.caps)}</b><span>📢 SHOUTED words</span></div><div class="card"><b>${fmt(M.questions)}</b><span>❓ question marks</span></div><div class="card"><b>${fmt(M.interrupts)}</b><span>✋ times you hit stop</span></div></div>`),
    slide('s4', 'th-b', hourEmoji(R.peakHour), 'Your rhythm', `<h1 class="rv">${hour(R.peakHour)} is your <span class="grad">hour</span>.</h1><p class="sub rv">${M.nightPrompts ? `<b>${fmt(M.nightPrompts)}</b> prompts after midnight. Go to sleep. 😴 ` : ''}${R.busiestDay ? `Busiest day: <b>${R.busiestDay.date}</b>, ${fmt(R.busiestDay.prompts)} prompts.` : ''}</p>
      <div class="bars rv">${bars(R.hours, R.peakHour)}</div><div class="axis rv"><span>12am</span><span>6am</span><span>12pm</span><span>6pm</span><span>11pm</span></div>`),
    slide('s4b', 'th-o', '🔥', 'Your year at a glance', `<h1 class="rv"><span class="grad">${fmt(T.activeDays)}</span> days. ${fmt(R.longestStreak)} in a row.</h1><div class="heat rv" role="img" aria-label="Activity heatmap for ${st.year}">${heat(st)}</div><p class="sub rv">Every square is a day. Brighter means more prompts.</p>`),
    st.topLanguages && st.topLanguages.length ? slide('s4c', 'th-g', '🌍', 'Languages Claude wrote for you', `<h1 class="rv"><span class="grad">${esc(st.topLanguages[0][0])}</span> was your main squeeze.</h1><ol class="rv">${st.topLanguages.map(([n, c]) => `<li><span>${esc(n)}</span><span>${fmt(c)} edits</span></li>`).join('')}</ol>`) : '',
    slide('s5', 'th-y', '🧰', 'Your toolkit', `<h1 class="rv">What Claude <span class="grad">actually did</span>.</h1><ol class="rv">${st.topTools.map(([n, c]) => `<li><span>${esc(n)}</span><span>${fmt(c)}</span></li>`).join('')}</ol>${st.topFile ? `<p class="sub rv">Most-edited file: <b>${esc(st.topFile.name)}</b>, ${fmt(st.topFile.edits)} edits. Yes, that one. 😬</p>` : ''}`),
    slide('s6', 'th-p', '💬', 'Words you kept saying', `<h1 class="rv"><span class="grad">${st.topWords.slice(0, 3).map(([w]) => esc(w)).join(', ') || '...'}</span></h1><ol class="rv">${st.topWords.slice(0, 6).map(([w, c]) => `<li><span>${esc(w)}</span><span>${fmt(c)}</span></li>`).join('')}</ol>`),
    st.achievements && st.achievements.length ? slide('s6b', 'th-y', '🏆', 'Badges unlocked', `<h1 class="rv"><span class="grad">${st.achievements.length}</span> earned this year.</h1><div class="badges rv">${st.achievements.map((a) => `<div class="badge"><b>${esc(a.name)}</b><span>${esc(a.why)}</span></div>`).join('')}</div>`) : '',
    slide('s7', 'th-o', p.emoji, 'Your Claude personality', `<h1 class="rv">${esc(p.name)}</h1><p class="sub rv">${esc(p.blurb)}</p><div class="rv"><canvas id="cv" width="1080" height="1350"></canvas></div>
      <div class="rv"><button class="btn" id="dl">Download card</button><button class="btn ghost" id="cp">Copy caption</button></div>`),
  ].join('\n');

  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="dark">
<title>Claude Wrapped ${st.year}</title>
<style>
:root{--ink:#f5f5f7;--mute:#a1a1a6;--font:-apple-system,BlinkMacSystemFont,"SF Pro Display","Inter","Segoe UI",system-ui,sans-serif}
*{box-sizing:border-box;margin:0}
html{scroll-snap-type:y mandatory;background:#000}
body{background:#000;color:var(--ink);font-family:var(--font);-webkit-font-smoothing:antialiased}
section{min-height:100svh;scroll-snap-align:start;position:relative;overflow:hidden;display:flex;align-items:center;padding:72px 24px}
section::before{content:"";position:absolute;inset:0;background:radial-gradient(70% 55% at 85% 0%,var(--g1),transparent 70%),radial-gradient(60% 50% at 0% 100%,var(--g2),transparent 70%);opacity:.9}
.th-o{--g1:#ff7a4555;--g2:#ff2d7a33;--a:#ff9f68;--b:#ff5c8a}
.th-y{--g1:#ffd60a44;--g2:#ff9f0a33;--a:#ffe066;--b:#ff9f0a}
.th-g{--g1:#30d15844;--g2:#0a84ff33;--a:#7be495;--b:#4cc9f0}
.th-p{--g1:#bf5af255;--g2:#5e5ce633;--a:#d9a4ff;--b:#7d7aff}
.th-b{--g1:#0a84ff55;--g2:#5e5ce633;--a:#7cc4ff;--b:#a78bfa}
.wrap{position:relative;max-width:880px;margin:0 auto;width:100%}
.emo{position:absolute;right:max(16px,6vw);top:12%;font-size:clamp(5rem,18vw,11rem);filter:drop-shadow(0 20px 40px #0008);animation:fl 5s ease-in-out infinite;z-index:1;line-height:1;opacity:.95}
@keyframes fl{0%,100%{transform:translateY(0) rotate(-4deg)}50%{transform:translateY(-16px) rotate(4deg)}}
.k{font-size:.85rem;font-weight:600;letter-spacing:.14em;text-transform:uppercase;color:var(--mute);margin-bottom:20px;position:relative;z-index:2}
h1{font-size:clamp(2.6rem,9vw,5.6rem);line-height:1.02;letter-spacing:-.04em;font-weight:800;max-width:13ch;position:relative;z-index:2}
.grad{background:linear-gradient(135deg,var(--a),var(--b));-webkit-background-clip:text;background-clip:text;color:transparent}
.big{font-size:clamp(4.5rem,22vw,11rem);line-height:.95;font-weight:800;letter-spacing:-.06em;font-variant-numeric:tabular-nums;position:relative;z-index:2}
.sub{font-size:clamp(1.1rem,3.2vw,1.55rem);line-height:1.4;color:var(--mute);max-width:30ch;margin-top:20px;position:relative;z-index:2}
.sub b{color:var(--ink);font-weight:600}
.cards{display:flex;flex-wrap:wrap;gap:12px;margin-top:36px;position:relative;z-index:2}
.card{background:#ffffff12;border:1px solid #ffffff1a;backdrop-filter:blur(24px) saturate(1.6);-webkit-backdrop-filter:blur(24px) saturate(1.6);border-radius:22px;padding:18px 22px;min-width:140px}
.card b{display:block;font-size:clamp(1.7rem,5vw,2.4rem);letter-spacing:-.03em}
.card span{color:var(--mute);font-size:.9rem}
.bars{display:flex;align-items:flex-end;gap:5px;height:170px;margin-top:34px;max-width:640px;position:relative;z-index:2}
.bars i{flex:1;background:linear-gradient(var(--a),var(--b));border-radius:6px 6px 2px 2px;opacity:.4}
.bars i.pk{opacity:1;box-shadow:0 0 24px var(--b)}
.axis{display:flex;justify-content:space-between;color:var(--mute);font-size:.75rem;max-width:640px;margin-top:8px;position:relative;z-index:2}
.heat{overflow-x:auto;grid-auto-columns:minmax(11px,1fr);display:grid;grid-auto-flow:column;grid-template-rows:repeat(7,1fr);gap:3px;margin-top:30px;max-width:900px;position:relative;z-index:2}
.heat i{aspect-ratio:1;border-radius:3px;background:#ffffff14}
.heat i[data-l="1"]{background:#ff9f6850}.heat i[data-l="2"]{background:#ff9f6890}.heat i[data-l="3"]{background:#ff7a45cc}.heat i[data-l="4"]{background:#ffd60a}
ol{list-style:none;padding:0;margin-top:30px;max-width:520px;position:relative;z-index:2;background:#ffffff0d;border:1px solid #ffffff14;border-radius:22px;backdrop-filter:blur(24px);-webkit-backdrop-filter:blur(24px)}
li{display:flex;justify-content:space-between;padding:15px 22px;border-bottom:1px solid #ffffff12;font-size:1.2rem}
li:last-child{border:0}li span:last-child{color:var(--mute);font-variant-numeric:tabular-nums}
.badges{display:flex;flex-wrap:wrap;gap:10px;margin-top:30px;max-width:760px;position:relative;z-index:2}
.badge{background:#ffffff12;border:1px solid #ffffff1f;border-radius:18px;padding:12px 16px;backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px)}
.badge b{display:block;font-size:1.05rem}.badge span{color:var(--mute);font-size:.82rem}
canvas{max-width:min(100%,400px);height:auto;border-radius:28px;margin-top:30px;box-shadow:0 30px 80px #000a;position:relative;z-index:2}
.btn{margin:26px 10px 0 0;padding:14px 26px;border-radius:999px;border:0;background:var(--ink);color:#000;font:600 1rem var(--font);cursor:pointer;position:relative;z-index:2;transition:transform .15s}
.btn:hover{transform:scale(1.04)}.btn.ghost{background:#ffffff1f;color:var(--ink);backdrop-filter:blur(20px)}
.dots{position:fixed;right:14px;top:50%;transform:translateY(-50%);display:flex;flex-direction:column;gap:9px;z-index:5}
.dots a{width:7px;height:7px;border-radius:50%;background:#ffffff33;display:block;transition:.3s}.dots a.on{background:#fff;transform:scale(1.5)}
.hint{position:fixed;bottom:16px;left:0;right:0;text-align:center;color:var(--mute);font-size:.78rem;pointer-events:none;z-index:5}
.rv{opacity:0;transform:translateY(28px);transition:opacity .8s cubic-bezier(.2,.7,.2,1),transform .8s cubic-bezier(.2,.7,.2,1)}
.in .rv{opacity:1;transform:none}.in .rv:nth-child(2){transition-delay:.08s}.in .rv:nth-child(3){transition-delay:.16s}.in .rv:nth-child(4){transition-delay:.24s}.in .rv:nth-child(5){transition-delay:.32s}
@media(max-width:600px){.emo{top:6%;opacity:.5}}
@media(prefers-reduced-motion:reduce){.rv{transition:none;opacity:1;transform:none}html{scroll-snap-type:none}.emo{animation:none}}
</style></head><body>
${slides}
<nav class="dots" aria-label="Slides"></nav>
<div class="hint">scroll ↓ or use arrow keys</div>
<script>
const D=${safeJson(data)};
const secs=[...document.querySelectorAll('section')],nav=document.querySelector('.dots');
secs.forEach((sc,i)=>{const a=document.createElement('a');a.href='#'+sc.id;a.setAttribute('aria-label','Slide '+(i+1));nav.appendChild(a)});
const dots=[...nav.children];
secs.forEach(sc=>new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting){sc.classList.add('in');sc.querySelectorAll('[data-n]').forEach(count);dots.forEach(d=>d.classList.remove('on'));dots[secs.indexOf(sc)].classList.add('on')}}),{threshold:.45}).observe(sc));
addEventListener('keydown',e=>{const cur=Math.max(0,dots.findIndex(d=>d.classList.contains('on')));const k=e.key;if(['ArrowDown','ArrowRight','PageDown',' '].includes(k)){e.preventDefault();secs[Math.min(secs.length-1,cur+1)].scrollIntoView({behavior:'smooth'})}if(['ArrowUp','ArrowLeft','PageUp'].includes(k)){e.preventDefault();secs[Math.max(0,cur-1)].scrollIntoView({behavior:'smooth'})}});
function count(el){if(el.dataset.done)return;el.dataset.done=1;const n=+el.dataset.n;if(matchMedia('(prefers-reduced-motion:reduce)').matches){el.textContent=n.toLocaleString();return}const t0=performance.now();(function f(t){const k=Math.min(1,(t-t0)/1400),e=1-Math.pow(1-k,4);el.textContent=Math.round(n*e).toLocaleString();if(k<1)requestAnimationFrame(f)})(t0)}
const st=D.st,p=D.p,cv=document.getElementById('cv'),x=cv.getContext('2d'),F='-apple-system,BlinkMacSystemFont,"SF Pro Display",Inter,"Segoe UI",system-ui,"Apple Color Emoji","Noto Color Emoji",sans-serif';
function compact(n){return n>=1e9?(n/1e9).toFixed(1)+'B':n>=1e6?(n/1e6).toFixed(1)+'M':n>=1e3?(n/1e3).toFixed(1)+'K':String(n)}
function hr(h){return (h%12||12)+(h<12?'am':'pm')}
function wrap(t,px,py,mw,lh){let line='',y=py;for(const w of t.split(' ')){const n=line?line+' '+w:w;if(x.measureText(n).width>mw&&line){x.fillText(line,px,y);line=w;y+=lh}else line=n}x.fillText(line,px,y);return y}
function draw(){
 const g=x.createLinearGradient(0,0,1080,1350);g.addColorStop(0,'#2a1208');g.addColorStop(.55,'#12090f');g.addColorStop(1,'#000');x.fillStyle=g;x.fillRect(0,0,1080,1350);
 const r=x.createRadialGradient(920,120,0,920,120,720);r.addColorStop(0,'#ff7a4577');r.addColorStop(1,'#0000');x.fillStyle=r;x.fillRect(0,0,1080,1350);
 const r2=x.createRadialGradient(100,1300,0,100,1300,600);r2.addColorStop(0,'#bf5af244');r2.addColorStop(1,'#0000');x.fillStyle=r2;x.fillRect(0,0,1080,1350);
 x.font='600 28px '+F;x.fillStyle='#a1a1a6';x.fillText('CLAUDE WRAPPED '+st.year,80,110);
 x.font='170px '+F;x.fillText(p.emoji,80,300);
 x.fillStyle='#f5f5f7';x.font='800 92px '+F;const ly=wrap(p.name,80,420,920,100);
 x.fillStyle='#a1a1a6';x.font='400 34px '+F;wrap(p.blurb,80,ly+80,880,46);
 const cells=[[st.totals.prompts.toLocaleString(),'prompts 🗣️','#ffd60a'],[compact(st.totals.tokens),'tokens 📚','#7be495'],[st.manners.please.toLocaleString(),'pleases 🙏','#ff9f68'],[st.rhythm.longestStreak+'d','best streak 🔥','#f5f5f7']];
 cells.forEach((c,i)=>{const cx=80+(i%2)*480,cy=700+Math.floor(i/2)*220;x.fillStyle='#ffffff14';x.beginPath();x.roundRect(cx,cy,440,196,32);x.fill();x.strokeStyle='#ffffff1f';x.lineWidth=2;x.stroke();x.fillStyle=c[2];x.font='800 78px '+F;x.fillText(c[0],cx+34,cy+98);x.fillStyle='#a1a1a6';x.font='400 30px '+F;x.fillText(c[1],cx+34,cy+152)});
 x.fillStyle='#6e6e73';x.font='400 26px '+F;x.fillText('Peak hour '+hr(st.rhythm.peakHour)+'   ·   Get yours: npx claude-wrapped',80,1290);
}
draw();
document.getElementById('dl').onclick=()=>{const a=document.createElement('a');a.download='claude-wrapped-'+st.year+'.png';a.href=cv.toDataURL('image/png');a.click()};
const cap=\`My Claude Code ${st.year} \${p.emoji}: \${st.totals.prompts.toLocaleString()} prompts, \${compact(st.totals.tokens)} tokens, said "please" \${st.manners.please} times. I'm \${p.name}. npx claude-wrapped\`;
document.getElementById('cp').onclick=async e=>{try{await navigator.clipboard.writeText(cap);e.target.textContent='Copied!'}catch{prompt('Copy:',cap)}};
</script></body></html>`;
}
