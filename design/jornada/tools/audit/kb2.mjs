export default async function ({ page, sleep }) {
  const P = page; const out = {};
  for (const smooth of [true, false]) for (const [w,h] of [[375,812],[1440,900]]) {
    await P.go({ w, h, path: '/pt/' });
    if (!smooth) await P.eval(`document.documentElement.style.setProperty('scroll-behavior','auto','important')`);
    const iss = [];
    for (let i = 0; i < 200; i++) {
      await P.send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9 });
      await P.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9 });
      await sleep(900);
      const r = await P.eval(`(()=>{const e=document.activeElement;const b=e.getBoundingClientRect();const st=parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop);const t=document.elementFromPoint(b.left+b.width/2,b.top+b.height/2);return {id:e.id||e.tagName+':'+(e.getAttribute('href')||e.dataset.step||e.textContent.trim().slice(0,12)),top:Math.round(b.top),bot:Math.round(b.bottom),vh:innerHeight,ok:!!t&&(t===e||e.contains(t)||t.contains(e)||(t.closest('label')&&t.closest('label')===e.closest('label'))),by:t?(t.closest('figure,.bar,.dock,.rail')?.className||'-'):'none'}})()`);
      if (!r.ok) iss.push(`${r.id} top${r.top} by ${r.by}`);
      if (r.id.includes('instagram')) break;
    }
    out[`${w} smooth=${smooth}`] = iss;
  }
  console.log(JSON.stringify(out, null, 1));
}
