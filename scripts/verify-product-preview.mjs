import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {mkdir,writeFile} from 'node:fs/promises';
import {join} from 'node:path';
const require=createRequire(import.meta.url);
const {chromium,webkit}=require(process.env.PLAYWRIGHT_MODULE||process.argv[3]||'playwright');
const stage=process.argv[2]||'after';
const base=process.env.PRODUCT_TEST_URL||'http://127.0.0.1:5191';
const output=join(process.env.CODEX_TEST_OUTPUT,'product-grid-stability');
const temporary=join(process.env.CODEX_WORK_OUTPUT,'product-row-browser');
await mkdir(output,{recursive:true});await mkdir(temporary,{recursive:true});process.env.TEMP=temporary;process.env.TMP=temporary;
const report={status:'RUNNING',stage,base,checks:[],errors:[]};
const resultPath=join(output,`${stage}.json`);await writeFile(resultPath,JSON.stringify(report));
const browser=await chromium.launch({headless:true});
try{
 const page=await browser.newPage({viewport:{width:1366,height:768}});page.on('pageerror',e=>report.errors.push(e.message));
 const arrange=async(width,height)=>{
  await page.setViewportSize({width,height});await page.goto(`${base}/shop`,{waitUntil:'domcontentloaded'});
  await page.locator('[data-product-expand]').first().waitFor();await page.evaluate(()=>document.fonts.ready);
  if(width>980&&await page.getByRole('button',{name:'Show highlights',exact:true}).count())await page.getByRole('button',{name:'Show highlights',exact:true}).click();
  await page.waitForTimeout(250);
  await page.evaluate(()=>{const e=document.querySelector('[data-product-expand]');const header=parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--site-header-height'))||0;window.scrollTo({top:e.getBoundingClientRect().top+scrollY-header-16,behavior:'instant'});});
  await page.waitForTimeout(500);
 };
 const geometry=()=>page.evaluate(()=>({y:scrollY,columns:getComputedStyle(document.querySelector('.product-browser-grid')).gridTemplateColumns.split(' ').length,count:document.querySelectorAll('[data-product-expand]').length,cards:[...document.querySelectorAll('[data-product-expand]')].slice(0,12).map(e=>{const r=e.getBoundingClientRect();return{x:r.x,y:r.y,width:r.width,height:r.height}})}));
 const assertStable=async(before,label)=>{const after=await geometry();assert.ok(Math.abs(after.y-before.y)<2,`${label}: page scrolled ${after.y-before.y}px`);assert.deepEqual(after.cards,before.cards,`${label}: product cards moved`);assert.equal(after.count,before.count);};
 await arrange(1366,768);const before=await geometry();await page.locator('[data-product-expand]').nth(1).click();await page.waitForTimeout(850);report.checks.push({before,after:await geometry()});
 if(stage==='before'){await page.screenshot({path:join(output,'before.png'),scale:'css'});}else{
  await assertStable(before,'Open');assert.ok(before.columns>=4);
  for(const [width,height] of [[1366,768],[1280,720],[1920,1080],[1024,768]]){
   await arrange(width,height);const initial=await geometry();await page.locator('[data-product-expand]').nth(1).click();await page.waitForTimeout(550);await assertStable(initial,'Open');
   const fit=await page.locator('.product-expanded-module').evaluate(e=>{const r=e.getBoundingClientRect();return{top:r.top,bottom:r.bottom,width:r.width,header:parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--site-header-height')),clipped:[...e.querySelectorAll('header,p,dl,.product-expanded-module__actions,.product-expanded-module__similar')].filter(n=>n.getBoundingClientRect().bottom>r.bottom+1||n.scrollHeight>n.clientHeight+2).map(n=>n.className||n.tagName)}});
   assert.ok(fit.top>=fit.header+13&&fit.bottom<=height-13&&fit.width<width*.85,JSON.stringify(fit));assert.deepEqual(fit.clipped,[]);
   await page.getByRole('button',{name:/^Next product:/}).click();await page.waitForTimeout(200);await assertStable(initial,'Next');
   await page.locator('.product-expanded-module__similar button').first().click();await page.waitForTimeout(200);await assertStable(initial,'Similar');
   await page.locator('[data-product-expand]').first().click();await page.waitForTimeout(200);await assertStable(initial,'Another card');
   await page.keyboard.press('Escape');await page.waitForTimeout(150);await assertStable(initial,'Close');assert.equal(await page.locator('.product-expanded-module').count(),0);
   report.checks.push({width,height,columns:initial.columns,fit,stable:'open, next, similar, other card, close'});
  }
  await arrange(1366,768);await page.locator('[data-product-expand]').nth(1).click();await page.waitForTimeout(300);await page.screenshot({path:join(output,`${stage}.png`),scale:'css'});
  const start=await page.evaluate(()=>scrollY);await page.mouse.move(180,550);await page.mouse.wheel(0,100);await page.waitForTimeout(160);const middle=await page.evaluate(()=>scrollY);await page.waitForTimeout(500);const end=await page.evaluate(()=>scrollY);assert.ok(start<middle&&middle<end);report.checks.push({wheel:{start,middle,end}});
  await arrange(390,844);const mobileBefore=await geometry();await page.locator('[data-product-expand]').nth(1).click();await page.waitForTimeout(300);await assertStable(mobileBefore,'Mobile open');assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);await page.screenshot({path:join(output,`${stage}-mobile.png`),scale:'css'});await page.keyboard.press('Escape');await page.waitForTimeout(100);await assertStable(mobileBefore,'Mobile close');
  const safari=await webkit.launch({headless:true});
  try{
   const p=await safari.newPage({viewport:{width:1366,height:768}});
   await p.goto(`${base}/shop`,{waitUntil:'domcontentloaded'});
   await p.locator('[data-product-expand]').first().waitFor();await p.evaluate(()=>document.fonts.ready);
   await p.waitForTimeout(250);
   await p.evaluate(()=>{const e=document.querySelector('[data-product-expand]');const header=parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--site-header-height'))||0;scrollTo({top:e.getBoundingClientRect().top+scrollY-header-16,behavior:'instant'});});
   await p.waitForTimeout(500);const y=await p.evaluate(()=>scrollY);
   await p.locator('[data-product-expand]').nth(1).click();await p.waitForTimeout(600);
   assert.ok(Math.abs(await p.evaluate(()=>scrollY)-y)<2);
   report.checks.push('WebKit: opening preserves page position');
  }finally{await safari.close();}
 }
 assert.deepEqual(report.errors,[]);report.status='PASS';
}catch(e){report.status='FAIL';report.failure=e.stack;throw e;}finally{await writeFile(resultPath,JSON.stringify(report,null,2));await browser.close();console.log(JSON.stringify({status:report.status,failure:report.failure}));}
