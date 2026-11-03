import { personality } from './analyze.mjs';

const safeJson = (o) => JSON.stringify(o).replace(/</g, '\\u003c').replace(/[\u2028\u2029]/g, '');

// Self-contained HTML: story slides + a canvas share card (PNG download). No network, no deps.
export function renderHtml(st) {
  const p = personality(st);
  // Share data is intentionally limited to non-sensitive aggregates (no project names, no prompt text).
  const data = { st: { ...st, longestPrompt: st.longestPrompt ? { chars: st.longestPrompt.chars } : null, topProjects: st.topProjects.map(([, n], i) => [`Project ${i + 1}`, n]) }, p };
  const full = { ...st, longestPrompt: st.longestPrompt ? { chars: st.longestPrompt.chars } : null };
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Claude Wrapped ${st.year}</title>
<style>
:root{--bg:#14110f;--ink:#faf5ee;--mute:#b9aea0;--accent:#d97757;--a2:#f2b84b;--a3:#7cc4a4}
*{box-sizing:border-box;margin:0}
html{scroll-snap-type:y mandatory}
body{background:var(--bg);color:var(--ink);font-family:ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif;-webkit-font-smoothing:antialiased}
section{min-height:100svh;scroll-snap-align:start;display:flex;flex-direction:column;justify-content:center;padding:48px max(24px,8vw);position:relative;overflow:hidden}
section::before{content:"";position:absolute;inset:-20%;background:radial-gradient(60% 50% at 80% 10%,var(--g,#d9775733),transparent 70%);pointer-events:none}
.k{font-size:.8rem;letter-spacing:.18em;text-transform:uppercase;color:var(--mute);margin-bottom:18px}
h1{font-size:clamp(2.6rem,9vw,6rem);line-height:1.02;letter-spacing:-.03em;max-width:14ch}
.big{font-size:clamp(4rem,19vw,12rem);line-height:.95;font-weight:800;letter-spacing:-.05em;color:var(--c,var(--accent));font-variant-numeric:tabular-nums}
.sub{font-size:clamp(1.1rem,3vw,1.6rem);color:var(--mute);max-width:34ch;margin-top:18px;line-height:1.35}
.sub b{color:var(--ink)}
.row{display:flex;flex-wrap:wrap;gap:28px 48px;margin-top:36px}
.stat b{display:block;font-size:clamp(1.8rem,5vw,3rem);letter-spacing:-.03em}
.stat span{color:var(--mute);font-size:.9rem}
.bars{display:flex;align-items:flex-end;gap:4px;height:160px;margin-top:32px;max-width:640px}
.bars i{flex:1;background:var(--a2);border-radius:4px 4px 0 0;min-height:3px;opacity:.55}
.bars i.pk{opacity:1;background:var(--accent)}
.axis{display:flex;justify-content:space-between;color:var(--mute);font-size:.75rem;max-width:640px;margin-top:8px}
ol{list-style:none;padding:0;margin-top:28px;max-width:520px}
li{display:flex;justify-content:space-between;padding:12px 0;border-bottom:1px solid #ffffff1a;font-size:1.25rem}
li span:last-child{color:var(--mute);font-variant-numeric:tabular-nums}
.btn{display:inline-block;margin:28px 12px 0 0;padding:14px 24px;border-radius:999px;border:0;background:var(--accent);color:#1a0f0a;font:600 1rem inherit;cursor:pointer}
.btn.ghost{background:transparent;color:var(--ink);border:1px solid #ffffff44}
canvas{max-width:min(100%,420px);height:auto;border-radius:20px;margin-top:28px;box-shadow:0 20px 60px #0008}
.hint{position:fixed;bottom:14px;left:0;right:0;text-align:center;color:var(--mute);font-size:.75rem;pointer-events:none}
.rv{opacity:0;transform:translateY(24px);transition:.7s cubic-bezier(.2,.7,.2,1)}
.in .rv{opacity:1;transform:none}
@media(prefers-reduced-motion:reduce){.rv{transition:none;opacity:1;transform:none}html{scroll-snap-type:none}}
</style></head><body>
<section id="s0" style="--g:#d9775744"><div class="k rv">Claude Wrapped</div><h1 class="rv">Your ${st.year} with Claude Code</h1><p class="sub rv">Scroll down. Everything here was computed on your machine. Nothing was uploaded.</p></section>
<section id="s1" style="--g:#f2b84b33"><div class="k rv">You talked. Claude listened.</div><div class="big rv" data-n="${st.totals.prompts}" style="--c:var(--a2)">0</div><p class="sub rv">prompts across <b>${fmt(st.totals.sessions)}</b> sessions on <b>${fmt(st.totals.activeDays)}</b> different days.</p>
<div class="row rv"><div class="stat"><b>${fmt(st.totals.hoursWithClaude)}h</b><span>side by side</span></div><div class="stat"><b>${fmt(st.totals.projects)}</b><span>projects touched</span></div><div class="stat"><b>${fmt(st.rhythm.longestStreak)}</b><span>day best streak</span></div></div></section>
<section id="s2" style="--g:#7cc4a433"><div class="k rv">Tokens</div><div class="big rv" style="--c:var(--a3)">${compact(st.totals.tokens)}</div><p class="sub rv">tokens moved. That is about <b>${fmt(Math.round(st.totals.tokens / 750000))}</b> copies of <i>War and Peace</i>, and Claude wrote <b>${compact(st.totals.outputTokens)}</b> of them.</p>
<div class="row rv"><div class="stat"><b>${fmt(st.totals.toolCalls)}</b><span>tool calls</span></div><div class="stat"><b>${fmt(st.totals.filesEdited)}</b><span>files edited</span></div></div></section>
<section id="s3"><div class="k rv">Manners</div><div class="big rv">${fmt(st.manners.please)}</div><p class="sub rv">times you said <b>please</b>. And <b>thanks</b> ${fmt(st.manners.thanks)} times. ${st.manners.swears ? `You also swore <b>${fmt(st.manners.swears)}</b> times. We will not tell.` : 'Not one swear word. Saint.'}</p>
<div class="row rv"><div class="stat"><b>${fmt(st.manners.caps)}</b><span>SHOUTED words</span></div><div class="stat"><b>${fmt(st.manners.questions)}</b><span>question marks</span></div><div class="stat"><b>${fmt(st.manners.interrupts)}</b><span>times you hit stop</span></div></div></section>
<section id="s4" style="--g:#f2b84b33"><div class="k rv">Your rhythm</div><h1 class="rv" style="max-width:20ch">${hour(st.rhythm.peakHour)} is your hour.</h1><p class="sub rv">${st.manners.nightPrompts ? `<b>${fmt(st.manners.nightPrompts)}</b> prompts landed between midnight and 5am. ` : ''}${st.rhythm.busiestDay ? `Busiest day: <b>${st.rhythm.busiestDay.date}</b> with ${fmt(st.rhythm.busiestDay.prompts)} prompts.` : ''}</p>
<div class="bars rv">${bars(st.rhythm.hours, st.rhythm.peakHour)}</div><div class="axis rv"><span>12am</span><span>6am</span><span>12pm</span><span>6pm</span><span>11pm</span></div></section>
<section id="s5"><div class="k rv">Your toolkit</div><h1 class="rv" style="max-width:20ch">What Claude actually did.</h1>
<ol class="rv">${st.topTools.map(([n, c]) => `<li><span>${esc(n)}</span><span>${fmt(c)}</span></li>`).join('')}</ol>
${st.topFile ? `<p class="sub rv">Most-edited file: <b>${esc(st.topFile.name)}</b>, ${fmt(st.topFile.edits)} edits. Yes, that one.</p>` : ''}</section>
<section id="s6" style="--g:#d9775744"><div class="k rv">Words you kept saying</div><h1 class="rv" style="max-width:20ch">${st.topWords.slice(0, 3).map(([w]) => esc(w)).join(', ') || '...'}</h1>
<ol class="rv">${st.topWords.slice(0, 6).map(([w, c]) => `<li><span>${esc(w)}</span><span>${fmt(c)}</span></li>`).join('')}</ol></section>
<section id="s7" style="--g:#d9775755"><div class="k rv">Your Claude personality</div><h1 class="rv">${esc(p.name)}</h1><p class="sub rv">${esc(p.blurb)}</p>
<div class="rv"><canvas id="cv" width="1080" height="1350"></canvas></div>
<div class="rv"><button class="btn" id="dl">Download card (PNG)</button><button class="btn ghost" id="cp">Copy caption</button></div></section>
<div class="hint">scroll ↓</div>
<script>
const D=${safeJson(data)};
const io=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting){e.target.classList.add('in');e.target.querySelectorAll('[data-n]').forEach(count)}}),{threshold:.4});
document.querySelectorAll('section').forEach(s=>io.observe(s));
function count(el){if(el.dataset.done)return;el.dataset.done=1;const n=+el.dataset.n;if(matchMedia('(prefers-reduced-motion:reduce)').matches){el.textContent=n.toLocaleString();return}const t0=performance.now();(function f(t){const k=Math.min(1,(t-t0)/1400),e=1-Math.pow(1-k,4);el.textContent=Math.round(n*e).toLocaleString();if(k<1)requestAnimationFrame(f)})(t0)}
const st=D.st,p=D.p,cv=document.getElementById('cv'),x=cv.getContext('2d');
function rr(a,b,w,h,r){x.beginPath();x.roundRect(a,b,w,h,r)}
function draw(){
 const g=x.createLinearGradient(0,0,1080,1350);g.addColorStop(0,'#241a14');g.addColorStop(1,'#14110f');x.fillStyle=g;x.fillRect(0,0,1080,1350);
 const r=x.createRadialGradient(900,100,0,900,100,700);r.addColorStop(0,'#d9775766');r.addColorStop(1,'#0000');x.fillStyle=r;x.fillRect(0,0,1080,1350);
 x.fillStyle='#b9aea0';x.font='600 30px system-ui,sans-serif';x.fillText('CLAUDE WRAPPED '+st.year,80,120);
 x.fillStyle='#faf5ee';x.font='800 96px system-ui,sans-serif';
 wrap(p.name,80,250,920,100);
 x.fillStyle='#b9aea0';x.font='400 34px system-ui,sans-serif';wrap(p.blurb,80,470,900,46);
 const cells=[[st.totals.prompts.toLocaleString(),'prompts'],[compact(st.totals.tokens),'tokens'],[st.manners.please.toLocaleString(),'pleases'],[st.rhythm.longestStreak+'d','best streak']];
 cells.forEach((c,i)=>{const cx=80+(i%2)*480,cy=640+Math.floor(i/2)*230;x.fillStyle='#ffffff10';rr(cx,cy,440,200,28);x.fill();x.fillStyle=['#f2b84b','#7cc4a4','#d97757','#faf5ee'][i];x.font='800 80px system-ui,sans-serif';x.fillText(c[0],cx+36,cy+105);x.fillStyle='#b9aea0';x.font='400 30px system-ui,sans-serif';x.fillText(c[1],cx+36,cy+158)});
 const mx=Math.max(...st.rhythm.hours,1);st.rhythm.hours.forEach((h,i)=>{x.fillStyle=i===st.rhythm.peakHour?'#d97757':'#f2b84b88';const bh=Math.max(6,h/mx*110);x.fillRect(80+i*39,1180-bh,28,bh)});
 x.fillStyle='#b9aea0';x.font='400 26px system-ui,sans-serif';x.fillText('peak hour: '+hr(st.rhythm.peakHour),80,1230);
 x.fillText('Get yours: npx claude-wrapped',80,1300);
}
function wrap(t,px,py,mw,lh){let line='',y=py;for(const w of t.split(' ')){const n=line?line+' '+w:w;if(x.measureText(n).width>mw&&line){x.fillText(line,px,y);line=w;y+=lh}else line=n}x.fillText(line,px,y)}
function compact(n){return n>=1e9?(n/1e9).toFixed(1)+'B':n>=1e6?(n/1e6).toFixed(1)+'M':n>=1e3?(n/1e3).toFixed(1)+'K':String(n)}
function hr(h){return (h%12||12)+(h<12?'am':'pm')}
draw();
document.getElementById('dl').onclick=()=>{const a=document.createElement('a');a.download='claude-wrapped-'+st.year+'.png';a.href=cv.toDataURL('image/png');a.click()};
const cap=\`My Claude Code ${st.year}: \${st.totals.prompts.toLocaleString()} prompts, \${compact(st.totals.tokens)} tokens, said "please" \${st.manners.please} times. I'm \${p.name}. npx claude-wrapped\`;
document.getElementById('cp').onclick=async e=>{try{await navigator.clipboard.writeText(cap);e.target.textContent='Copied!'}catch{prompt('Copy:',cap)}};
</script></body></html>`;
}

function fmt(n) { return Number(n).toLocaleString('en-US'); }
function compact(n) { return n >= 1e9 ? (n / 1e9).toFixed(1) + 'B' : n >= 1e6 ? (n / 1e6).toFixed(1) + 'M' : n >= 1e3 ? (n / 1e3).toFixed(1) + 'K' : String(n); }
function hour(h) { return (h % 12 || 12) + (h < 12 ? 'am' : 'pm'); }
function esc(s) { return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
function bars(h, pk) { const m = Math.max(...h, 1); return h.map((v, i) => `<i class="${i === pk ? 'pk' : ''}" style="height:${Math.max(2, (v / m) * 100)}%"></i>`).join(''); }
