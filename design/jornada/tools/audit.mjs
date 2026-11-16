#!/usr/bin/env node
/* Auditoria E10 · harness CDP independente do cdp.mjs (portas 8771/9334).
   Uso: node design/jornada/tools/audit.mjs <roteiro.mjs> [args...]
   O roteiro exporta `default async function(ctx)`; ctx = {Page, page, sleep, HTTP, ROOT, out, args}.
   Servidor próprio em Node com gzip (como o GitHub Pages), 301 em diretório sem barra e 404.html com status 404.
   Chrome headless; tudo é encerrado no finally. */
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, readFileSync, existsSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, dirname, extname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { gzipSync } from 'node:zlib';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const DOCS = join(ROOT, 'docs');
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const PORT = +(process.env.CDP_PORT || 9334), HTTP = +(process.env.HTTP_PORT || 8771);
const sleep = ms => new Promise(r => setTimeout(r, ms));
const MIME = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.json': 'application/json', '.xml': 'application/xml', '.txt': 'text/plain', '.svg': 'image/svg+xml', '.avif': 'image/avif', '.jpg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp', '.ico': 'image/x-icon' };
export const served = [];
function serve() {
  const gz = process.env.NOGZIP ? false : true;
  const srv = createServer((req, res) => {
    const u = new URL(req.url, 'http://x'); let p = decodeURIComponent(u.pathname);
    let f = join(DOCS, p);
    if (!f.startsWith(DOCS)) { res.writeHead(403); return res.end(); }
    if (existsSync(f) && statSync(f).isDirectory()) {
      if (!p.endsWith('/')) { res.writeHead(301, { Location: p + '/' + u.search }); return res.end(); }
      f = join(f, 'index.html');
    }
    let status = 200;
    if (!existsSync(f)) { status = 404; f = join(DOCS, '404.html'); }
    let body = readFileSync(f); const type = MIME[extname(f)] || 'application/octet-stream';
    const h = { 'Content-Type': type, 'Cache-Control': 'no-store' };
    if (gz && /gzip/.test(req.headers['accept-encoding'] || '') && /html|css|javascript|json|xml|svg|text/.test(type)) { body = gzipSync(body); h['Content-Encoding'] = 'gzip'; }
    served.push({ p, status, bytes: body.length });
    res.writeHead(status, h); res.end(body);
  });
  return new Promise(r => srv.listen(HTTP, '127.0.0.1', () => r(srv)));
}

export class Page {
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
        if (d.method === 'Runtime.consoleAPICalled' && ['error', 'warning', 'assert'].includes(d.params.type)) p.logs.push(d.params.type + ': ' + d.params.args.map(a => a.value ?? a.description).join(' '));
        if (d.method === 'Runtime.exceptionThrown') p.logs.push('exception: ' + (d.params.exceptionDetails.exception?.description || d.params.exceptionDetails.text));
        if (d.method === 'Log.entryAdded' && ['error', 'warning'].includes(d.params.entry.level)) p.logs.push(d.params.entry.level + ': ' + d.params.entry.text + ' ' + (d.params.entry.url || ''));
      }
    };
    await p.send('Page.enable'); await p.send('Runtime.enable'); await p.send('Log.enable'); await p.send('Network.enable');
    await p.send('Network.setCacheDisabled', { cacheDisabled: true });
    return p;
  }
  send(method, params = {}) { const id = ++this.id; this.ws.send(JSON.stringify({ id, method, params })); return new Promise((res, rej) => this.cb.set(id, { res, rej })); }
  waitEvent(name, ms = 30000) { return new Promise((res, rej) => { const f = d => { if (d.method === name) { this.ev = this.ev.filter(x => x !== f); clearTimeout(t); res(d.params); } }; const t = setTimeout(() => rej(new Error('timeout ' + name)), ms); this.ev.push(f); }); }
  async eval(expr, awaitPromise = true) {
    const r = await this.send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise });
    if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text);
    return r.result.value;
  }
  async go({ w = 1440, h = 900, mobile, theme = 'light', reduced = false, path = '/pt/', query = '', hash = '', dpr = 1, noJs = false, init = '', cpu = 1, net = null, clear = true }) {
    await this.send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: dpr, mobile: mobile ?? w < 820 });
    await this.send('Emulation.setTouchEmulationEnabled', { enabled: mobile ?? w < 820 });
    await this.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: reduced ? 'reduce' : 'no-preference' }, { name: 'prefers-color-scheme', value: theme }] });
    this.noJs = !!noJs;
    await this.send('Emulation.setScriptExecutionDisabled', { value: !!noJs });
    await this.send('Emulation.setCPUThrottlingRate', { rate: cpu });
    await this.send('Network.emulateNetworkConditions', net || { offline: false, latency: 0, downloadThroughput: -1, uploadThroughput: -1 });
    if (this.sid) await this.send('Page.removeScriptToEvaluateOnNewDocument', { identifier: this.sid });
    const until = Date.now() + 48 * 3600e3;
    const tok = Math.random().toString(36).slice(2);
    const src = `${clear ? `try{if(sessionStorage.__k!=='${tok}'){localStorage.clear();sessionStorage.__k='${tok}'}}catch(e){}` : ''}try{localStorage.setItem('np-theme',${JSON.stringify(JSON.stringify({ theme, until }))})}catch(e){}${init}`;
    this.sid = (await this.send('Page.addScriptToEvaluateOnNewDocument', { source: src })).identifier;
    this.logs = [];
    await this.send('Page.navigate', { url: 'about:blank' });
    await this.send('Network.clearBrowserCache');
    const loaded = this.waitEvent('Page.loadEventFired', 60000);
    await this.send('Page.navigate', { url: `http://127.0.0.1:${HTTP}${path}${query}${hash}` });
    await loaded;
    if (!noJs) await this.eval('document.fonts.ready.then(()=>1)');
    await sleep(300);
  }
  async scrollTo(y) {
    if (this.noJs) { await this.eval(`(document.documentElement.style.scrollBehavior='auto',window.scrollTo({top:${y},behavior:'instant'}),1)`); await sleep(250); return; }
    await this.eval(`(document.documentElement.style.scrollBehavior='auto',window.scrollTo({top:${y},behavior:'instant'}), new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(()=>r(1)))))`);
    await sleep(60);
  }
  async shot(file, clip) {
    mkdirSync(dirname(file), { recursive: true });
    const r = await this.send('Page.captureScreenshot', { format: 'png', ...(clip ? { clip: { ...clip, scale: 1 } } : {}) });
    writeFileSync(file, Buffer.from(r.data, 'base64'));
    return r.data;
  }
}

const argv = process.argv.slice(2);
const procs = []; let profile = null, srv = null;
function shutdown() {
  for (const p of procs) { try { p.kill('SIGKILL'); } catch { } }
  if (srv) try { srv.close(); srv.closeAllConnections?.(); } catch { }
  if (profile) try { rmSync(profile, { recursive: true, force: true }); } catch { }
}
process.on('SIGINT', () => { shutdown(); process.exit(130); });
try {
  srv = await serve();
  profile = mkdtempSync(join(tmpdir(), 'np-audit-'));
  const ch = spawn(CHROME, ['--headless=new', `--remote-debugging-port=${PORT}`, '--hide-scrollbars', '--no-first-run', '--no-default-browser-check',
    '--disable-background-timer-throttling', '--disable-renderer-backgrounding', `--user-data-dir=${profile}`, 'about:blank'], { stdio: 'ignore' });
  procs.push(ch);
  for (let i = 0; i < 80; i++) { try { const r = await fetch(`http://127.0.0.1:${PORT}/json/version`); if (r.ok) break; } catch { } await sleep(150); }
  const page = await Page.open();
  const mod = await import(pathToFileURL(resolve(argv[0])).href);
  const out = join(ROOT, 'design/jornada/qa/audit');
  mkdirSync(out, { recursive: true });
  const code = await mod.default({ Page, page, sleep, HTTP, ROOT, out, args: argv.slice(1), served });
  if (code) process.exitCode = code;
} catch (e) { console.error(e); process.exitCode = 1; }
finally { shutdown(); }
