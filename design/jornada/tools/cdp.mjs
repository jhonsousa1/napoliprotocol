#!/usr/bin/env node
/* QA da jornada via Chrome DevTools Protocol. Sem dependências (Node 18+ com WebSocket global).
   Uso: node design/jornada/tools/cdp.mjs <shots|checks|perf|func|kb|eval> [opções]
   Opções comuns:
     --path /pt/            página (padrão /pt/)
     --vp 375x812,1440x900  viewports (padrão 375x812,1440x900)
     --theme light,dark     temas (padrão light,dark)
     --motion on|off|both   (padrão on)  off = prefers-reduced-motion emulado
     --driver css|js        força ?np-driver=js quando js
     --out design/jornada/qa/impl/<nome>
     --ids s1,s2            ladrilhos (padrão: todos)
   Sobe um servidor estático (python3 -m http.server 8770 --directory docs, sem gzip) e um Chrome headless na 9333;
   os dois são encerrados no `finally`. Não use --window-size: abaixo de 500 px o headless não emula mobile. */
import { spawn } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const PORT = 9333, HTTP = 8770;
const argv = process.argv.slice(2);
const cmd = argv[0] || 'shots';
const opt = (k, d) => { const i = argv.indexOf('--' + k); return i >= 0 ? (argv[i + 1] ?? true) : d; };
const list = (k, d) => String(opt(k, d)).split(',').filter(Boolean);
const sleep = ms => new Promise(r => setTimeout(r, ms));

const procs = [];
let profile = null;
async function boot() {
  const srv = spawn('python3', ['-m', 'http.server', String(HTTP), '--directory', join(ROOT, 'docs'), '--bind', '127.0.0.1'], { stdio: 'ignore' });
  procs.push(srv);
  profile = mkdtempSync(join(tmpdir(), 'np-cdp-'));
  const ch = spawn(CHROME, ['--headless=new', `--remote-debugging-port=${PORT}`, '--hide-scrollbars', '--no-first-run', '--no-default-browser-check',
    '--disable-background-timer-throttling', '--disable-renderer-backgrounding', `--user-data-dir=${profile}`, 'about:blank'], { stdio: 'ignore' });
  procs.push(ch);
  for (let i = 0; i < 80; i++) {
    try { const r = await fetch(`http://127.0.0.1:${PORT}/json/version`); if (r.ok) break; } catch { }
    await sleep(150);
  }
  for (let i = 0; i < 40; i++) { try { const r = await fetch(`http://127.0.0.1:${HTTP}/`); if (r.status) break; } catch { } await sleep(100); }
}
function shutdown() {
  for (const p of procs) { try { p.kill('SIGKILL'); } catch { } }
  if (profile) try { rmSync(profile, { recursive: true, force: true }); } catch { }
}
process.on('SIGINT', () => { shutdown(); process.exit(130); });

class Page {
  constructor(ws) { this.ws = ws; this.id = 0; this.cb = new Map(); this.ev = []; this.logs = []; }
  static async open() {
    const list = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json();
    const t = list.find(x => x.type === 'page');
    const ws = new WebSocket(t.webSocketDebuggerUrl);
    await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
    const p = new Page(ws);
    ws.onmessage = m => {
      const d = JSON.parse(m.data);
      if (d.id && p.cb.has(d.id)) { const { res, rej } = p.cb.get(d.id); p.cb.delete(d.id); d.error ? rej(new Error(d.error.message)) : res(d.result); }
      else if (d.method) {
        p.ev.forEach(f => f(d));
        if (d.method === 'Runtime.consoleAPICalled' && ['error', 'warning'].includes(d.params.type)) p.logs.push(d.params.type + ': ' + d.params.args.map(a => a.value ?? a.description).join(' '));
        if (d.method === 'Runtime.exceptionThrown') p.logs.push('exception: ' + (d.params.exceptionDetails.exception?.description || d.params.exceptionDetails.text));
        if (d.method === 'Log.entryAdded' && ['error', 'warning'].includes(d.params.entry.level)) p.logs.push(d.params.entry.level + ': ' + d.params.entry.text + ' ' + (d.params.entry.url || ''));
      }
    };
    await p.send('Page.enable'); await p.send('Runtime.enable'); await p.send('Log.enable'); await p.send('Network.enable');
    return p;
  }
  send(method, params = {}) { const id = ++this.id; this.ws.send(JSON.stringify({ id, method, params })); return new Promise((res, rej) => this.cb.set(id, { res, rej })); }
  waitEvent(name, ms = 20000) { return new Promise((res, rej) => { const f = d => { if (d.method === name) { this.ev = this.ev.filter(x => x !== f); clearTimeout(t); res(d.params); } }; const t = setTimeout(() => rej(new Error('timeout ' + name)), ms); this.ev.push(f); }); }
  async eval(expr, awaitPromise = true) {
    const r = await this.send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise });
    if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text);
    return r.result.value;
  }
  /* cenário: viewport, mídia, tema, navegação */
  async scenario({ w, h, mobile, theme = 'light', reduced = false, path = '/pt/', query = '', dpr = 1, noJs = false, init = '', cpu = 1, net = null }) {
    await this.send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: dpr, mobile: mobile ?? w < 820 });
    await this.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: reduced ? 'reduce' : 'no-preference' }] });
    await this.send('Emulation.setScriptExecutionDisabled', { value: false });
    await this.send('Emulation.setCPUThrottlingRate', { rate: cpu });
    await this.send('Network.emulateNetworkConditions', net || { offline: false, latency: 0, downloadThroughput: -1, uploadThroughput: -1 });
    if (this.sid) await this.send('Page.removeScriptToEvaluateOnNewDocument', { identifier: this.sid });
    const until = Date.now() + 48 * 3600e3;
    const src = `try{localStorage.setItem('np-theme',${JSON.stringify(JSON.stringify({ theme, until }))})}catch(e){}${init}`;
    this.sid = (await this.send('Page.addScriptToEvaluateOnNewDocument', { source: src })).identifier;
    this.logs = [];
    await this.send('Page.navigate', { url: 'about:blank' });
    if (noJs) await this.send('Emulation.setScriptExecutionDisabled', { value: true });
    const loaded = this.waitEvent('Page.loadEventFired', 30000);
    await this.send('Page.navigate', { url: `http://127.0.0.1:${HTTP}${path}${query}` });
    await loaded;
    if (!noJs) await this.eval('document.fonts.ready.then(()=>1)');
    await sleep(250);
  }
  async scrollTo(y) {
    await this.eval(`window.scrollTo({top:${y},behavior:'instant'}); new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(()=>r(1))))`);
    await sleep(80);
  }
  async shot(file, clip) {
    mkdirSync(dirname(file), { recursive: true });
    const r = await this.send('Page.captureScreenshot', { format: 'png', ...(clip ? { clip: { ...clip, scale: 1 } } : {}) });
    writeFileSync(file, Buffer.from(r.data, 'base64'));
  }
}

const vps = () => list('vp', '375x812,1440x900').map(s => { const [w, h] = s.split('x').map(Number); return { w, h }; });
const motions = () => { const m = opt('motion', 'on'); return m === 'both' ? [false, true] : [m === 'off']; };
const sceneQuery = (reduced) => {
  const q = [];
  if (opt('driver', 'css') === 'js') q.push('np-driver=js');
  const extra = opt('query', ''); if (extra) q.push(extra);
  return q.length ? '?' + q.join('&') : '';
};

/* geometria de cada ladrilho em coordenadas do documento (journey.js expõe NP.geo) */
const GEO = `(()=>{const g=(window.NP&&NP.geo)?NP.geo():null;const tiles=[...document.querySelectorAll('.journey .tile, main > .tile')].map(t=>{const r=t.getBoundingClientRect();return {id:t.id,top:r.top+scrollY,bottom:r.bottom+scrollY,h:r.height,cls:t.className}});return {g,tiles,vh:innerHeight,vw:innerWidth,doc:document.documentElement.scrollHeight}})()`;

async function cmdShots(pg) {
  const out = resolve(ROOT, opt('out', 'design/jornada/qa/impl/shots'));
  const ids = list('ids', ''); const path = opt('path', '/pt/');
  for (const vp of vps()) for (const theme of list('theme', 'light,dark')) for (const reduced of motions()) {
    await pg.scenario({ ...vp, theme, reduced, path, query: sceneQuery(reduced), dpr: opt('dpr', vp.w < 600 ? 2 : 1) * 1 });
    const geo = await pg.eval(GEO);
    const tag = `${vp.w}x${vp.h}-${theme}${reduced ? '-rm' : ''}`;
    const { g, tiles } = geo;
    const sel = tiles.filter(t => !ids.length || ids.includes(t.id));
    const mode = String(opt('mode', 'rest,pass')).split(',');
    if (mode.includes('top')) { await pg.scrollTo(0); await pg.shot(join(out, `top-${tag}.png`)); }
    for (let i = 0; i < tiles.length; i++) {
      const t = tiles[i]; if (!sel.includes(t)) continue;
      if (mode.includes('rest')) {
        const y = reduced ? t.top - 64 : await pg.eval(`NP.restY('${t.id}')`);
        await pg.scrollTo(y); await pg.shot(join(out, `${t.id || 'x' + i}-${tag}.png`));
      }
      if (mode.includes('pass') && !reduced && g && tiles[i + 1]) {
        const y = t.bottom - g.top0 - 0.5 * g.A;
        await pg.scrollTo(y); await pg.shot(join(out, `pass-${t.id}-${tiles[i + 1].id}-${tag}.png`));
      }
    }
    if (pg.logs.length) console.log(tag, 'console:', pg.logs.slice(0, 5));
  }
  console.log('shots em', out);
}

async function cmdChecks(pg) {
  const results = []; const fail = (name, info) => results.push({ name, ok: false, info });
  const pass = (name, info) => results.push({ name, ok: true, info });
  const path = opt('path', '/pt/');
  const sizes = list('vp', '360x640,375x812,768x1024,1024x768,1280x720,1440x900,1920x1080').map(s => { const [w, h] = s.split('x').map(Number); return { w, h }; });
  for (const vp of sizes) for (const theme of list('theme', 'light,dark')) for (const reduced of [false, true]) {
    await pg.scenario({ ...vp, theme, reduced, path });
    const r = await pg.eval(`({sw:document.documentElement.scrollWidth,bw:document.body.scrollWidth,iw:innerWidth})`);
    const tag = `hscroll ${vp.w}x${vp.h} ${theme}${reduced ? ' rm' : ''}`;
    (r.sw <= r.iw && r.bw <= r.iw) ? pass(tag, r) : fail(tag, r);
    const gaps = await pg.eval(`(()=>{const t=[...document.querySelectorAll('main > .tile, .journey .tile')];const r=[];for(let i=1;i<t.length;i++){const d=t[i].getBoundingClientRect().top-t[i-1].getBoundingClientRect().bottom;if(Math.abs(d)>0.01)r.push([t[i].id,d])}return r})()`);
    gaps.length ? fail(`gaps ${vp.w}x${vp.h}`, gaps) : pass(`gaps ${vp.w}x${vp.h} ${theme}${reduced ? ' rm' : ''}`);
    if (pg.logs.length) fail(`console ${vp.w}x${vp.h} ${theme}${reduced ? ' rm' : ''}`, pg.logs.slice(0, 5));
  }
  const bad = results.filter(r => !r.ok);
  console.log(JSON.stringify({ total: results.length, failed: bad.length, bad }, null, 1));
  return bad.length ? 1 : 0;
}

const cmds = { shots: cmdShots, checks: cmdChecks };
try {
  await boot();
  const pg = await Page.open();
  if (cmd === 'eval') { await pg.scenario({ w: +opt('w', 1440), h: +opt('h', 900), path: opt('path', '/pt/'), query: sceneQuery() }); console.log(JSON.stringify(await pg.eval(argv[argv.indexOf('--js') + 1]), null, 1)); if (pg.logs.length) console.log('console:', pg.logs); }
  else {
    const mod = cmds[cmd] || (await import('./cdp-more.mjs')).cmds[cmd];
    if (!mod) throw new Error('subcomando desconhecido: ' + cmd);
    pg.sleep = sleep; const code = await mod(pg, { opt, list, vps, motions, sceneQuery, GEO, sleep, ROOT, join, resolve, sizes: null, Page });
    if (code) process.exitCode = code;
  }
} catch (e) { console.error(e); process.exitCode = 1; }
finally { shutdown(); }
