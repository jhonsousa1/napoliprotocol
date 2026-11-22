import { join } from 'node:path';
// captura o diário de fornadas com uma entrada salva (claro, 1440 e 375)
export default async function ({ page, out }) {
  for (const [w, h] of [[1440, 900], [375, 812]]) {
    await page.go({ w, h, path: '/pt/' });
    await page.eval(`(()=>{document.querySelector('#lStone').value=410;document.querySelector('#lDough').value=24.5;document.querySelector('#lNote').value='Fundo um pouco escuro; cornicione bom.';document.querySelector('#logForm').requestSubmit();})()`);
    const y = await page.eval(`document.querySelector('#diario').getBoundingClientRect().top+scrollY-80`);
    await page.scrollTo(y); await page.shot(join(out, `diario-${w}.png`));
    await page.eval(`localStorage.clear()`);
  }
}
