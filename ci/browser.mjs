// Execute on GitHub-hosted CI only. Local interactive QA uses the supported browser.
if (process.env.CI !== 'true') throw new Error('Run this browser driver in CI; use tests/browser.html for interactive QA.');
const {chromium} = await import('./node_modules/playwright/index.mjs');
const {createServer} = await import('node:http');
const {readFile} = await import('node:fs/promises');
const {assertBrowserResults} = await import('./browser-result.mjs');
const paths = new Map([
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
} finally {
  await browser?.close();
  await new Promise(resolve=>server.close(resolve));
}
