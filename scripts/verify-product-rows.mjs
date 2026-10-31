import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {mkdir, readFile, writeFile} from 'node:fs/promises';
import {join} from 'node:path';

const require = createRequire(import.meta.url);
const {chromium, webkit} = require(process.env.PLAYWRIGHT_MODULE || process.argv[2] || 'playwright');
const root = process.env.CODEX_GENERATED_OUTPUT;
if (!root) throw new Error('Run through StorageGuard with the registered Electrical-Website layout.');
const output = join(process.env.CODEX_TEST_OUTPUT, 'product-row-focus');
const temporary = join(process.env.CODEX_WORK_OUTPUT, 'product-row-browser');
await mkdir(output, {recursive: true});
await mkdir(temporary, {recursive: true});
process.env.TEMP = temporary;
process.env.TMP = temporary;
const report = {status: 'RUNNING', viewports: [], checks: [], errors: []};
const reportPath = join(output, 'results.json');
await writeFile(reportPath, JSON.stringify(report, null, 2));
const browser = await chromium.launch({headless: true});
const context = await browser.newContext();
const page = await context.newPage();
page.on('pageerror', error => report.errors.push(error.message));
const base = process.env.PRODUCT_TEST_URL || 'http://127.0.0.1:5191';
const wait = () => page.waitForTimeout(700);
const geometry = () => page.evaluate(() => {
  const rect = selector => {
    const element = document.querySelector(selector);
    const box = element.getBoundingClientRect();
    return {top: box.top, bottom: box.bottom, left: box.left, right: box.right, width: box.width, height: box.height};
  };
  const header = Number.parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--site-header-height'));
  const panel = rect('.product-expanded-module');
  const details = rect('.product-browser-details');
  const grid = document.querySelector('.product-browser-grid');
  const style = getComputedStyle(grid);
  const clippedRegions = [...document.querySelectorAll('.product-expanded-module__content, .product-expanded-module__content header, .product-expanded-module__content>p, .product-expanded-module dl, .product-expanded-module__actions, .product-expanded-module__similar')]
    .filter(element => {
      const box = element.getBoundingClientRect();
      return box.top < panel.top || box.bottom > panel.bottom + 1 || element.scrollHeight > element.clientHeight + 2;
    }).map(element => element.className || element.tagName);
  return {viewport: [innerWidth, innerHeight], header, panel, details,
    clippedRegions,
    availableWidth: grid.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight),
    overflow: document.documentElement.scrollWidth > innerWidth,
    count: document.querySelectorAll('[data-product-expand]').length};
});
try {
  for (const [width, height] of [[2048,1018], [1366,768], [1024,768], [820,900], [760,900], [390,844], [320,568]]) {
    await page.setViewportSize({width, height});
    await page.goto(`${base}/shop`, {waitUntil: 'domcontentloaded'});
    await page.locator('[data-product-expand]').first().waitFor();
    await page.evaluate(() => document.fonts.ready);
    if (width > 820 && await page.getByRole('button', {name: 'Show highlights', exact: true}).count()) {
      await page.getByRole('button', {name: 'Show highlights', exact: true}).click();
    }
    const count = await page.locator('[data-product-expand]').count();
    for (const index of [0, 3, 5]) {
      await page.locator('[data-product-expand]').nth(index).click();
      await wait();
      const result = await geometry();
      assert.equal(result.overflow, false, `Horizontal overflow at ${width}`);
      assert.equal(result.count, count, 'Expansion must retain every product card');
      assert.ok(Math.abs(result.panel.width - result.availableWidth) < 2, 'Details must fill the row');
      assert.ok(result.panel.top >= result.header + 13 && result.panel.top <= result.header + 20,
        `Panel is not aligned below header: ${JSON.stringify(result)}`);
      if (width >= 981) {
        assert.ok(result.panel.bottom <= height - 13, 'Desktop details must fit within the available viewport');
        assert.deepEqual(result.clippedRegions, [], 'Every detail must remain visible inside the desktop panel');
      }
      assert.equal(await page.locator('[data-product-expand][aria-expanded="true"]').count(), 1);
      if (index === 5) report.viewports.push(result);
    }
    const currentProduct = await page.getByRole('link', {name: /Product page/}).getAttribute('href');
    await page.getByRole('button', {name: /^Next product:/}).click();
    await wait();
    assert.notEqual(await page.getByRole('link', {name: /Product page/}).getAttribute('href'), currentProduct);
    await page.getByRole('button', {name: /^Previous product:/}).click();
    await wait();
    assert.equal(await page.getByRole('link', {name: /Product page/}).getAttribute('href'), currentProduct);
    await page.locator('.product-expanded-module__similar button').first().click();
    await wait();
    assert.notEqual(await page.getByRole('link', {name: /Product page/}).getAttribute('href'), currentProduct);
    await page.keyboard.press('Escape');
    assert.equal(await page.locator('.product-browser-details').count(), 0);
    await page.waitForFunction(id => document.activeElement?.getAttribute('data-product-expand') === id,
      await page.locator('[data-product-expand]').nth(5).getAttribute('data-product-expand'));
    assert.equal(await page.locator('[data-product-expand]').nth(5).evaluate(e => e === document.activeElement), true);
    report.checks.push(`${width}: open first/middle/end-of-row, full width, header clearance, next/previous/similar, Escape/focus`);
  }

  await page.setViewportSize({width:1280,height:720});
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.goto(`${base}/shop?view=all`,{waitUntil:'domcontentloaded'});
  await page.locator('[data-product-expand]').first().waitFor();
  await page.evaluate(()=>document.fonts.ready);
  const catalogue = JSON.parse(await readFile(new URL('../src/data/legacy-products.json', import.meta.url), 'utf8'));
  const longest = catalogue.sort((a,b)=>b.name.length-a.name.length).slice(0,8);
  for (const product of longest) {
    await page.locator(`[data-product-expand="${product.id}"]`).click();
    await page.waitForTimeout(800);
    const result = await geometry();
    assert.ok(Math.abs(result.panel.top-result.header-16)<3 && result.panel.bottom<=720-13,
      `A distant catalogue product must remain fully visible: ${JSON.stringify(result)}`);
    assert.deepEqual(result.clippedRegions,[]);
    assert.ok((await page.getByRole('link',{name:/Product page/}).getAttribute('href')).endsWith(`/shop/product/${product.id}`));
  }
  report.checks.push('Full catalogue: eight longest titles in distant rows fit completely at 1280×720');
  await page.emulateMedia({reducedMotion:'no-preference'});

  await page.setViewportSize({width: 2048, height: 1018});
  await page.goto(`${base}/shop`, {waitUntil: 'domcontentloaded'});
  await page.locator('[data-product-expand]').first().waitFor();
  if (await page.getByRole('button', {name: 'Show highlights', exact: true}).count()) await page.getByRole('button', {name: 'Show highlights', exact: true}).click();
  await page.locator('[data-product-expand]').nth(1).click();
  await wait();
  for (const name of ['Hide highlights', 'Show highlights']) {
    await page.getByRole('button', {name, exact:true}).click();
    await wait();
    await page.waitForFunction(() => {
      const panel = document.querySelector('.product-expanded-module')?.getBoundingClientRect();
      const header = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--site-header-height'));
      return panel && Math.abs(panel.top - header - 16) < 3 && panel.bottom <= innerHeight - 13;
    }, undefined, {timeout:5000});
    const result = await geometry();
    assert.ok(Math.abs(result.panel.top - result.header - 16) < 3 && result.panel.bottom <= 1018 - 13,
      'An open panel must remain fully visible when Highlights is toggled');
    assert.deepEqual(result.clippedRegions, []);
  }
  report.checks.push('Highlights on/off: open desktop details remain aligned and entirely visible');
  await page.screenshot({path: join(output, 'desktop-after.png'), scale: 'css'});
  await page.mouse.move(700,650);
  const start = await page.evaluate(() => scrollY);
  await page.evaluate(() => { window.rowFrames = []; const collect = t => { window.rowFrames.push({t, y: scrollY}); if(window.rowFrames.length < 50) requestAnimationFrame(collect); }; requestAnimationFrame(collect); });
  await page.mouse.wheel(0, 100);
  await page.waitForTimeout(180);
  const intermediate = await page.evaluate(() => scrollY);
  await wait();
  const end = await page.evaluate(() => scrollY);
  assert.ok(start < intermediate && intermediate < end, 'Scroll must animate through intermediate positions');
  await page.mouse.wheel(0, -100);
  await wait();
  assert.ok(Math.abs(await page.evaluate(() => scrollY) - start) <= 2, 'Reverse wheel must return to the previous row');
  report.motion = await page.evaluate(() => {
    const intervals = window.rowFrames.slice(1).map((f,i) => f.t - window.rowFrames[i].t).sort((a,b)=>a-b);
    return {samples: intervals.length, medianFrameMs: intervals[Math.floor(intervals.length*.5)], p95FrameMs: intervals[Math.floor(intervals.length*.95)], maxFrameMs: Math.max(...intervals)};
  });
  report.checks.push('Wheel down/up: intermediate animation frames and exact return to previous row');

  // Desktop details must fit together; the next gesture advances to the next row.
  await page.setViewportSize({width:1366,height:768});
  await page.locator('[data-product-expand]').nth(2).click();
  await wait();
  const tallStart = await page.evaluate(() => scrollY);
  const tallBefore = await geometry();
  assert.ok(tallBefore.panel.bottom <= 768 - 13, 'Image and every detail must fit below Highlights');
  await page.mouse.move(650,600);
  await page.mouse.wheel(0,100);
  await wait();
  const tallEnd = await page.evaluate(() => scrollY);
  report.tallPanel = {before:tallBefore, after:await geometry(), scrollBefore:tallStart, scrollAfter:tallEnd};
  assert.ok(tallEnd - tallStart > tallBefore.panel.height, 'One gesture must advance past the complete panel to the next row');
  report.checks.push('Short desktop viewport: complete details fit, next gesture advances to the next row');
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.mouse.wheel(0,100);
  await page.waitForTimeout(80);
  const reducedEnd = await page.evaluate(()=>scrollY);
  await page.waitForTimeout(500);
  assert.equal(await page.evaluate(()=>scrollY), reducedEnd);
  await page.emulateMedia({reducedMotion:'no-preference'});
  report.checks.push('Reduced motion: no animated scrolling');

  await page.setViewportSize({width:390,height:844});
  await page.locator('[data-product-expand]').nth(3).click();
  await wait();
  await page.screenshot({path: join(output, 'mobile-after.png'), scale: 'css'});
  await page.locator('.product-expanded-module__content h2').scrollIntoViewIfNeeded();
  await page.screenshot({path: join(output, 'mobile-content-after.png'), scale: 'css'});
  await page.getByRole('link', {name:/Product page/}).click();
  await page.waitForURL(/\/shop\/product\//);
  await page.locator('.product-expanded-module.is-standalone').waitFor({state:'visible'});
  assert.equal(await page.locator('.product-expanded-module.is-standalone').count(),1);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  report.checks.push('Product page route still opens without overflow');

  const touchContext = await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
  const touchPage = await touchContext.newPage();
  await touchPage.goto(`${base}/shop`,{waitUntil:'domcontentloaded'});
  await touchPage.locator('[data-product-expand]').nth(1).tap();
  await touchPage.waitForTimeout(750);
  const touchStartY = await touchPage.evaluate(()=>scrollY);
  const input = await touchContext.newCDPSession(touchPage);
  await input.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:180,y:650}]});
  for(let y=620;y>=380;y-=30){
    await input.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:180,y}]});
    await touchPage.waitForTimeout(30);
  }
  await input.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  await touchPage.waitForTimeout(1400);
  const touchResult = await touchPage.evaluate(()=>({y:scrollY,panelTop:document.querySelector('.product-expanded-module').getBoundingClientRect().top,panelBottom:document.querySelector('.product-expanded-module').getBoundingClientRect().bottom}));
  assert.ok(touchResult.y>touchStartY,'Touch swipe must advance through the panel');
  assert.ok(Math.abs(touchResult.panelBottom-(844-16))<3 || Math.abs(touchResult.panelTop-(126+16))<3,
    `Touch must settle at a readable panel stop: ${JSON.stringify(touchResult)}`);
  report.touch = touchResult;
  report.checks.push('Trusted mobile touch swipe settles after native momentum');
  await touchContext.close();

  const safari = await webkit.launch({headless:true});
  try {
    const safariPage = await safari.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
    safariPage.on('pageerror',error=>report.errors.push(error.message));
    await safariPage.goto(`${base}/shop`,{waitUntil:'domcontentloaded'});
    await safariPage.locator('[data-product-expand]').nth(2).tap();
    await safariPage.waitForTimeout(750);
    const safariResult = await safariPage.evaluate(()=>({top:document.querySelector('.product-expanded-module').getBoundingClientRect().top,overflow:document.documentElement.scrollWidth>innerWidth}));
    assert.ok(Math.abs(safariResult.top-142)<3 && !safariResult.overflow,JSON.stringify(safariResult));
    await safariPage.screenshot({path:join(output,'webkit-mobile-after.png'),scale:'css'});
    report.checks.push('WebKit mobile: panel below fixed command bar, no horizontal overflow');
  } finally { await safari.close(); }
  assert.deepEqual(report.errors, []);
  report.status = 'PASS';
} catch (error) {
  report.status = 'FAIL';
  report.failure = error.stack;
  throw error;
} finally {
  await writeFile(reportPath, JSON.stringify(report, null, 2));
  await browser.close();
  console.log(JSON.stringify(report, null, 2));
}
