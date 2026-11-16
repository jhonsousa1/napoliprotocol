// args: index.json key cols cellW out.png [filter regex]
import { readFileSync } from 'node:fs';
import { basename } from 'node:path';
export default async function ({ page, args, sleep }) {
  const [idx, key, cols, cw, png, flt] = args;
  let fs = JSON.parse(readFileSync(idx))[key]; if (flt) fs = fs.filter(f => new RegExp(flt).test(basename(f)));
  const W = cols * (+cw + 4);
  await page.send('Emulation.setDeviceMetricsOverride', { width: W, height: 800, deviceScaleFactor: 1, mobile: false });
  await page.send('Page.navigate', { url: 'about:blank' }); await sleep(300);
  const cells = fs.map(f => `<div><img src="data:image/png;base64,${readFileSync(f).toString('base64')}" style="width:${cw}px;display:block"><div style="background:#000;color:#fff;font:12px sans-serif">${basename(f)}</div></div>`).join('');
  await page.eval(`document.body.style.margin=0;document.body.innerHTML=${JSON.stringify(`<div style="display:grid;grid-template-columns:repeat(${cols},${cw}px);gap:4px;background:#777">${cells}</div>`)};Promise.all([...document.images].map(i=>i.decode()))`);
  const h = await page.eval('document.documentElement.scrollHeight');
  await page.send('Emulation.setDeviceMetricsOverride', { width: W, height: h, deviceScaleFactor: 1, mobile: false });
  await sleep(300); await page.shot(png); console.log(png, W, h);
}
