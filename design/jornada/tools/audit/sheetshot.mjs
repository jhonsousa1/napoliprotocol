// args: html out.png width
export default async function ({ page, args, sleep }) {
  const [html, png, w] = args;
  await page.send('Emulation.setDeviceMetricsOverride', { width: +w, height: 800, deviceScaleFactor: 1, mobile: false });
  const loaded = page.waitEvent('Page.loadEventFired', 60000);
  await page.send('Page.navigate', { url: 'file://' + html }); await loaded; await sleep(500);
  const h = await page.eval('document.documentElement.scrollHeight');
  await page.send('Emulation.setDeviceMetricsOverride', { width: +w, height: h, deviceScaleFactor: 1, mobile: false });
  await sleep(300);
  await page.shot(png);
  console.log(png, h);
}
