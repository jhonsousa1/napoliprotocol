import { join } from 'node:path';
export default async function ({ page, out }) {
  const P = page;
  await P.go({ w: 768, h: 1024, path: '/pt/new-york/' });
  const geo = await P.eval(`(()=>{const g=NP.geo();const t=document.getElementById('s11').getBoundingClientRect();const u=document.getElementById('s12').getBoundingClientRect();return {g,b:t.bottom+scrollY,h12:u.height}})()`);
  for (const f of [0.3, 0.5, 0.7]) { await P.scrollTo(geo.b - geo.g.top0 - f * geo.g.A); await P.shot(join(out, `ny-768-s11-s12-${f}.png`)); }
  console.log(JSON.stringify(geo));
}
