import { join } from 'node:path';
import { writeFileSync } from 'node:fs';
export default async function ({ page, out, args, sleep }) {
  const [paths, vps, themes, sub, driver] = [args[0] || '/pt/', args[1] || '1440x900', args[2] || 'light', args[3] || 'shots', args[4] || 'css'];
  const sheets = {};
  for (const path of paths.split(',')) for (const vp of vps.split(',')) for (const theme of themes.split(',')) {
    const [w, h] = vp.split('x').map(Number);
    await page.go({ w, h, theme, path, dpr: 1, query: driver === 'js' ? '?np-driver=js' : '' });
    const geo = await page.eval(`(()=>{const g=NP.geo();return {g,t:[...document.querySelectorAll('main > .tile, .journey .tile')].map(t=>{const r=t.getBoundingClientRect();return {id:t.id,top:r.top+scrollY,bottom:r.bottom+scrollY}}),doc:document.documentElement.scrollHeight}})()`);
    const tag = `${path.replace(/\//g, '_')}${w}x${h}-${theme}${driver==='js'?'-jsd':''}`;
    const list = [];
    for (let i = 0; i < geo.t.length; i++) {
      const t = geo.t[i];
      await page.scrollTo(await page.eval(`NP.restY('${t.id}')`)); await sleep(150);
      const f = join(out, sub, `${tag}-${String(i).padStart(2, '0')}-${t.id}.png`); await page.shot(f); list.push(f);
      if (geo.t[i + 1]) {
        await page.scrollTo(t.bottom - geo.g.top0 - 0.5 * geo.g.A); await sleep(150);
        const f2 = join(out, sub, `${tag}-${String(i).padStart(2, '0')}x-${t.id}-${geo.t[i + 1].id}.png`); await page.shot(f2); list.push(f2);
      }
    }
    // epílogo
    await page.scrollTo(await page.eval(`document.getElementById('epilogo').getBoundingClientRect().top+scrollY-200`)); await sleep(150);
    const fe = join(out, sub, `${tag}-99-epi.png`); await page.shot(fe); list.push(fe);
    sheets[tag] = list;
    if (page.logs.length) console.log(tag, 'console', page.logs);
  }
  writeFileSync(join(out, sub, 'index.json'), JSON.stringify(sheets, null, 1));
  console.log(Object.keys(sheets).map(k => k + ' ' + sheets[k].length).join('\n'));
}
