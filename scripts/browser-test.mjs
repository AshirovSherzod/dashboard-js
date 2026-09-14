import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { readFile, writeFile, mkdir, mkdtemp, access } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createServer, projectRoot } from './serve.mjs';

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const candidates = [process.env.CHROME_PATH, 'C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', '/usr/bin/google-chrome', '/usr/bin/chromium', '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'].filter(Boolean);
let chrome;
for (const candidate of candidates) { try { await access(candidate); chrome = candidate; break; } catch {} }
if (!chrome) throw new Error('Install Chrome/Chromium or set CHROME_PATH to run the browser checks.');
const profile = await mkdtemp(path.join(os.tmpdir(), 'dashly-check-'));
const server = createServer();
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const base = 'http://127.0.0.1:' + server.address().port;
const args = ['--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check', '--remote-debugging-port=0', '--user-data-dir=' + profile, 'about:blank'];
if (process.env.DASHLY_CHROME_NO_SANDBOX === '1') args.unshift('--no-sandbox');
const browser = spawn(chrome, args, { windowsHide: true, stdio: 'ignore' });
let ws;
const errors = [], failedRequests = [], externalRequests = [];
const pending = new Map();
const report = [];
const watchdog = setTimeout(() => { console.error('Browser checks timed out.'); browser.kill(); server.close(); process.exit(1); }, 120000);
try {
  let port;
  for (let i = 0; i < 100; i++) {
    try { port = (await readFile(path.join(profile, 'DevToolsActivePort'), 'utf8')).split('\n')[0]; break; } catch { await sleep(100); }
  }
  if (!port) throw new Error('Chrome did not start. In a restricted environment use DASHLY_CHROME_NO_SANDBOX=1 with this isolated test profile.');
  const targets = await (await fetch('http://127.0.0.1:' + port + '/json/list')).json();
  ws = new WebSocket(targets.find(target => target.type === 'page').webSocketDebuggerUrl);
  await new Promise((resolve, reject) => { ws.onopen = resolve; ws.onerror = reject; });
  let id = 0;
  ws.onmessage = event => {
    const message = JSON.parse(event.data);
    if (message.id) {
      const call = pending.get(message.id);
      if (call) { clearTimeout(call.timer); pending.delete(message.id); message.error ? call.reject(new Error(JSON.stringify(message.error))) : call.resolve(message.result); }
    }
    if (message.method === 'Runtime.exceptionThrown') errors.push(message.params.exceptionDetails.exception?.description || message.params.exceptionDetails.text);
    if (message.method === 'Network.responseReceived' && message.params.response.status >= 400) failedRequests.push(message.params.response.url);
    if (message.method === 'Network.requestWillBeSent' && /^https?:/.test(message.params.request.url) && !message.params.request.url.startsWith(base)) externalRequests.push(message.params.request.url);
  };
  ws.onclose = () => { for (const call of pending.values()) { clearTimeout(call.timer); call.reject(new Error('Browser closed')); } pending.clear(); };
  const send = (method, params = {}) => new Promise((resolve, reject) => {
    const current = ++id;
    const timer = setTimeout(() => { pending.delete(current); reject(new Error('CDP timeout: ' + method)); }, 15000);
    pending.set(current, { resolve, reject, timer });
    ws.send(JSON.stringify({ id: current, method, params }));
  });
  const evaluate = async expression => {
    const result = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true, userGesture: true });
    if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text);
    return result.result.value;
  };
  const wait = async expression => {
    for (let attempt = 0; attempt < 80; attempt++) { if (await evaluate(expression)) return; await sleep(100); }
    throw new Error('Condition not reached: ' + expression);
  };
  const click = selector => evaluate('document.querySelector(' + JSON.stringify(selector) + ').click()');
  const input = (selector, value, event = 'input') => evaluate('document.querySelector(' + JSON.stringify(selector) + ').value=' + JSON.stringify(value) + ';document.querySelector(' + JSON.stringify(selector) + ').dispatchEvent(new Event(' + JSON.stringify(event) + ',{bubbles:true}))');
  const viewport = async (width, height = 1000) => {
    await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: false });
    await sleep(80);
  };
  const screenshot = async (name, full = false) => {
    await sleep(150);
    const options = { format: 'png', captureBeyondViewport: full };
    if (full) {
      const metrics = await send('Page.getLayoutMetrics');
      options.clip = { x: 0, y: 0, width: metrics.cssContentSize.width, height: metrics.cssContentSize.height, scale: 1 };
    }
    const capture = await send('Page.captureScreenshot', options);
    await writeFile(path.join(projectRoot, 'assets/images', name + '.png'), Buffer.from(capture.data, 'base64'));
  };
  const check = async (name, fn) => { await fn(); report.push(name); console.log('PASS ' + name); };
  await send('Page.enable'); await send('Runtime.enable'); await send('Network.enable');
  await mkdir(path.join(profile, 'downloads'));
  await send('Browser.setDownloadBehavior', { behavior: 'allow', downloadPath: path.join(profile, 'downloads'), eventsEnabled: true });
  await viewport(1440, 960);
  await send('Page.navigate', { url: base });
  await wait("document.readyState==='complete' && !!document.querySelector('.try-demo')");
  await screenshot('demo-login');
  await check('Login responsive at the former 825px overflow breakpoint', async () => {
    await viewport(825, 850);
    assert.equal(await evaluate('document.documentElement.scrollWidth <= innerWidth'), true);
    await viewport(390, 844); await screenshot('demo-login-mobile');
    assert.equal(await evaluate('document.documentElement.scrollWidth <= innerWidth'), true);
  });
  await check('One-click demo and complete seeded directory', async () => {
    await click('.try-demo');
    await wait("document.querySelector('#total-customers')?.textContent==='40'");
    assert.equal(await evaluate("document.querySelectorAll('tbody tr').length"), 10);
    assert.equal(await evaluate("document.querySelector('#active-customers').textContent"), '30');
    assert.equal(await evaluate("document.querySelector('#country-count').textContent"), '13');
    assert.equal(await evaluate("document.querySelector('.page-indicator').textContent"), 'Page 1 of 4');
  });
  await viewport(1440, 1080); await screenshot('demo-desktop', true);
  await check('Pagination changes visible customers and keeps global totals', async () => {
    const first = await evaluate("document.querySelector('tbody .customer-name').textContent");
    await click('.next-page');
    assert.notEqual(await evaluate("document.querySelector('tbody .customer-name').textContent"), first);
    assert.equal(await evaluate("document.querySelector('#total-customers').textContent"), '40');
    await click('.previous-page');
  });
  await check('Combined email, country and status filters; empty state; clear filters', async () => {
    await input('#search', 'karimov@example.com');
    await input('#status-filter', 'inactive', 'change');
    await input('#country-filter', 'Uzbekistan', 'change');
    assert.equal(await evaluate("document.querySelectorAll('tbody tr').length"), 1);
    assert.equal(await evaluate("document.querySelector('tbody .customer-name').textContent"), 'Ali Karimov');
    await input('#status-filter', 'active', 'change');
    assert.equal(await evaluate("document.querySelector('.empty-state').hidden"), false);
    assert.equal(await evaluate("document.querySelector('.export-button').disabled"), true);
    await click('.empty-action');
    assert.equal(await evaluate("document.querySelectorAll('tbody tr').length"), 10);
  });
  await check('Sorting synchronizes column header and selector', async () => {
    await click('[data-sort="full_name"]');
    assert.equal(await evaluate("document.querySelector('#sort-order').value"), 'full_name:desc');
    assert.equal(await evaluate("document.querySelector('[data-sort=\"full_name\"]').closest('th').getAttribute('aria-sort')"), 'descending');
    await input('#sort-order', 'full_name:asc', 'change');
  });
  await check('Whitespace and invalid phone validation prevent saving', async () => {
    await click('.add-customer');
    for (const [name, value] of Object.entries({ full_name: '   ', email: 'review@example.com', phone_number: 'abcdef', country: '   ' })) await input('[name="' + name + '"]', value);
    await evaluate("document.querySelector('.customer-form').requestSubmit()");
    assert.equal(await evaluate("document.querySelector('.edit-dialog').open"), true);
    assert.equal(await evaluate("document.querySelectorAll('[aria-invalid=\"true\"]').length"), 3);
    assert.equal(await evaluate("document.querySelector('#total-customers').textContent"), '40');
  });
  await check('Native dialog contains keyboard focus and fits a short viewport', async () => {
    await evaluate("document.querySelector('.save-customer').focus()");
    await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9 });
    await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9 });
    assert.equal(await evaluate("!!document.activeElement.closest('.edit-dialog')"), true);
    await viewport(390, 400);
    const rect = await evaluate("(()=>{const r=document.querySelector('.edit-dialog').getBoundingClientRect();return {top:r.top,bottom:r.bottom,height:innerHeight}})()");
    assert.ok(rect.top >= 0 && rect.bottom <= rect.height);
    await viewport(1440, 1080);
  });
  await check('Add customer appears immediately and survives refresh', async () => {
    for (const [name, value] of Object.entries({ full_name: 'Review Customer', email: 'review@example.com', phone_number: '+998 90 123 45 67', country: 'Uzbekistan', company: 'Demo Review' })) await input('[name="' + name + '"]', value);
    await evaluate("document.querySelector('.customer-form').requestSubmit()");
    await wait("document.querySelector('#total-customers').textContent==='41' && !document.querySelector('.edit-dialog').open");
    assert.equal(await evaluate("document.querySelector('tbody .customer-name').textContent"), 'Review Customer');
    await send('Page.reload');
    await wait("document.querySelector('#total-customers')?.textContent==='41'");
    await input('#search', 'review@example.com');
    assert.equal(await evaluate("document.querySelector('tbody .customer-name').textContent"), 'Review Customer');
  });
  await check('Details, edit, status toggle and real activity', async () => {
    await click('tbody .customer-name');
    assert.equal(await evaluate("document.querySelector('#detail-name').textContent"), 'Review Customer');
    await click('.detail-edit');
    await wait("document.querySelector('.edit-dialog').open");
    await input('[name="full_name"]', 'Updated Review Customer');
    await evaluate("document.querySelector('.customer-form').requestSubmit()");
    await wait("!document.querySelector('.edit-dialog').open");
    assert.equal(await evaluate("document.querySelector('tbody .customer-name').textContent"), 'Updated Review Customer');
    await click('tbody .status-button');
    await wait("document.querySelector('tbody .status-button').textContent==='Inactive'");
    await click('.activity-toggle');
    assert.equal(await evaluate("document.querySelector('.activity-list').textContent.includes('marked inactive')"), true);
    await click('.activity-toggle');
  });
  await check('CSV download exports filtered results', async () => {
    await click('.export-button');
    const { readdir } = await import('node:fs/promises');
    let file;
    for (let i = 0; i < 50; i++) { file = (await readdir(path.join(profile, 'downloads'))).find(name => name.endsWith('.csv')); if (file) break; await sleep(100); }
    assert.ok(file, 'CSV should download');
    const csv = await readFile(path.join(profile, 'downloads', file), 'utf8');
    assert.ok(csv.includes('Updated Review Customer'));
    assert.ok(!csv.includes('Alex Morgan'));
    assert.equal(csv.split('\r\n').length, 2);
  });
  await check('Delete cancellation is safe, confirmed deletion updates results', async () => {
    await click('tbody .delete');
    assert.equal(await evaluate("document.activeElement.textContent"), 'Cancel');
    await click('.confirm-dialog [data-close]');
    assert.equal(await evaluate("document.querySelector('#total-customers').textContent"), '41');
    await click('tbody .delete');
    await click('.confirm-action');
    await wait("document.querySelector('#total-customers').textContent==='40' && !document.querySelector('.confirm-dialog').open");
    assert.equal(await evaluate("document.querySelector('.empty-state').hidden"), false);
    await click('.empty-action');
  });
  await check('Mobile uses cards, navigation closes with Escape and hidden sidebar is inert', async () => {
    await viewport(390, 844);
    assert.equal(await evaluate("getComputedStyle(document.querySelector('.table-scroll')).display"), 'none');
    assert.equal(await evaluate("getComputedStyle(document.querySelector('.mobile-customer-list')).display"), 'grid');
    assert.equal(await evaluate("document.querySelector('.sidebar').inert"), true);
    await click('.mobile-menu');
    assert.equal(await evaluate("document.querySelector('main').inert"), true);
    await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
    assert.equal(await evaluate("document.body.classList.contains('sidebar-open')"), false);
    assert.equal(await evaluate("document.querySelector('main').inert"), false);
  });
  await check('Reset restores samples and clears filters', async () => {
    await click('.mobile-menu'); await click('.reset-demo'); await click('.confirm-action');
    await wait("!document.querySelector('.confirm-dialog').open");
    assert.equal(await evaluate("document.querySelector('#total-customers').textContent"), '40');
    assert.equal(await evaluate("JSON.parse(localStorage.getItem('dashly.customers.v1')).activity.length"), 1);
    assert.equal(await evaluate("document.querySelector('#search').value"), '');
  });
  await check('Guide opens, dark appearance persists and no viewport overflows', async () => {
    await click('.demo-banner .help-button');
    assert.equal(await evaluate("document.querySelector('.help-dialog').open"), true);
    await click('.help-dialog [data-close]');
    await click('.mobile-menu'); await click('.theme-toggle');
    assert.equal(await evaluate("document.documentElement.dataset.theme"), 'dark');
    await click('.sidebar-backdrop');
    await send('Page.reload');
    await wait("document.querySelector('#total-customers')?.textContent==='40'");
    assert.equal(await evaluate("document.documentElement.dataset.theme"), 'dark');
    for (const width of [320, 390, 720, 768, 825, 1024, 1440]) {
      await viewport(width, 1000);
      assert.equal(await evaluate('document.documentElement.scrollWidth <= innerWidth'), true, 'No horizontal overflow at ' + width);
    }
    await viewport(1440, 1080); await screenshot('demo-dark', true);
    await click('.theme-toggle');
    await viewport(390, 844);
    await screenshot('demo-mobile', true);
    await click('.mobile-customer .customer-name');
    await screenshot('demo-profile-mobile');
    await click('.detail-dialog [data-close]');
  });
  await check('Exit returns to welcome page and credentials still work', async () => {
    await click('.profile-toggle'); await click('.exit-demo');
    await wait("!!document.querySelector('.try-demo')");
    await click('.credential-details summary');
    await evaluate("document.querySelector('.login-sect__form').requestSubmit()");
    assert.equal(await evaluate("document.querySelector('.login-message').textContent.includes('valid email')"), true);
    await input('.username-input', 'admin@gmail.com'); await input('.password-input', 'administhebest3467');
    await evaluate("document.querySelector('.login-sect__form').requestSubmit()");
    await wait("document.querySelector('#total-customers')?.textContent==='40'");
  });
  await viewport(1200, 630);
  await send('Page.navigate', { url: base + '/assets/social-card.html' });
  await wait("document.readyState==='complete' && document.querySelector('img')?.complete");
  await screenshot('social-preview');
  assert.deepEqual(errors, [], 'No uncaught JavaScript errors');
  assert.deepEqual(failedRequests, [], 'No failed page assets');
  assert.deepEqual(externalRequests, [], 'No external dependencies or API requests');
  console.log('PASS No JavaScript errors, missing assets or external runtime requests');
  await mkdir(path.join(projectRoot, '.cache'), { recursive: true });
  await writeFile(path.join(projectRoot, '.cache/browser-report.json'), JSON.stringify({ checks: report, errors, failedRequests, externalRequests }, null, 2));
  console.log(report.length + ' browser checks passed. Screenshots saved in assets/images/.');
  await send('Browser.close').catch(() => {});
} finally {
  clearTimeout(watchdog);
  ws?.close();
  browser.kill();
  server.close();
}
