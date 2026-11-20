// Execute on GitHub-hosted CI only. Local interactive QA uses the supported browser.
if (process.env.CI !== 'true') throw new Error('Run this browser driver in CI; use tests/browser.html for interactive QA.');
const {chromium} = await import('./node_modules/playwright/index.mjs');
const {strict: assert} = await import('node:assert');
const {createServer} = await import('node:http');
const {readFile} = await import('node:fs/promises');
const {assertBrowserResults} = await import('./browser-result.mjs');
const paths = new Map([
  ['/', ['index.html','text/html; charset=utf-8']],
  ['/app.js', ['app.js','text/javascript; charset=utf-8']],
  ['/style.css', ['style.css','text/css; charset=utf-8']],
  ['/tests/browser.html', ['tests/browser.html','text/html; charset=utf-8']],
  ['/engine.js', ['engine.js','text/javascript; charset=utf-8']],
  ['/storage.js', ['storage.js','text/javascript; charset=utf-8']],
]);
const server = createServer(async(req,res)=>{
  const entry=paths.get(req.url);
  if(!entry){res.writeHead(404);res.end();return;}
  try {res.writeHead(200,{'Content-Type':entry[1]});res.end(await readFile(new URL('../'+entry[0],import.meta.url)));}
  catch {res.writeHead(500);res.end('Unable to read fixture');}
});
let browser;
try {
  await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});
  const origin='http://127.0.0.1:'+server.address().port;
  browser=await chromium.launch();
  const context=await browser.newContext(); // No signed-in state or real player data.
  await context.route('**/*',route=>route.request().url().startsWith(origin+'/')?route.continue():route.abort());
  const page=await context.newPage(),errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  await page.goto(origin+'/tests/browser.html');
  await page.locator('#run').click();
  await page.waitForFunction(()=>!document.querySelector('#run').disabled,{},{timeout:30000});
  const result=await page.locator('#results').innerText();
  console.log(result);
  if(errors.length)throw new Error(errors.join('\n'));
  assertBrowserResults(result);
  const checks = await Promise.allSettled([null, 'sea'].map(async ending => {
    const route = ending ? 'alternate ending' : 'correct passphrase';
    const gameContext = await browser.newContext();
    try {
      await gameContext.route('**/*', request => request.request().url().startsWith(origin+'/') ? request.continue() : request.abort());
      await gameContext.addInitScript(ending => {
        localStorage.setItem('anomalous-everyday-v1', JSON.stringify({
          version: 1, solved: {umbrella: 'keep', lift: 'return', moon: 'keep'}, ending,
        }));
      }, ending);
      const game = await gameContext.newPage();
      const errors = [];
      game.on('pageerror', error => errors.push(error.message));
      await game.goto(origin+'/');
      await game.locator('#start').press('Enter');
      if (ending) {
        await game.locator('#alternate').press('Enter');
      } else {
        await game.locator('#code').fill('留一天');
        await game.keyboard.press('Enter');
      }
      const choices = game.locator('#ending-choices');
      await choices.locator('h2').waitFor();
      assert.equal(await game.evaluate(() => document.activeElement === document.querySelector('#ending-choices h2')), true, route + ': focus did not move to the choices heading');
      await game.keyboard.press('Tab');
      assert.equal(await game.evaluate(() => document.activeElement?.dataset.ending), 'garden', route + ': Tab did not move to the first ending');
      await game.keyboard.press('Enter');
      await game.locator('.ending').waitFor();
      assert.equal(await game.evaluate(() => document.activeElement?.id), 'main', route + ': focus did not move to the ending view');
      assert.deepEqual(errors, [], route + ': unexpected page errors');
      console.log(route + ': heading focus, first choice and ending focus passed');
    } finally {
      await gameContext.close();
    }
  }));
  const failures = checks.filter(check => check.status === 'rejected');
  if (failures.length) throw new Error(failures.map(check => check.reason.message).join('\n'));
} finally {
  await browser?.close();
  await new Promise(resolve=>server.close(resolve));
}
