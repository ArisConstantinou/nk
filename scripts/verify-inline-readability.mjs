import {createRequire} from 'node:module';
import {pathToFileURL} from 'node:url';
import {mkdir,writeFile} from 'node:fs/promises';
import {join} from 'node:path';
import assert from 'node:assert/strict';

const mode=process.argv[2]||'before';
const output=join(process.env.CODEX_TEST_OUTPUT,'inline-readability');
const work=join(process.env.CODEX_WORK_OUTPUT,'inline-readability');
await mkdir(output,{recursive:true});await mkdir(work,{recursive:true});
process.env.TEMP=work;process.env.TMP=work;
const require=createRequire(join(process.cwd(),'package.json'));
const pw=require(process.env.PLAYWRIGHT_MODULE||process.argv[3]||'playwright');
const base=process.env.PRODUCT_TEST_URL||(mode==='before'?'https://arisconstantinou.github.io/nk':'http://127.0.0.1:5191');
let server;
if(base.includes('127.0.0.1')){
  const existing=await fetch(base).then(r=>r.ok).catch(()=>false);
  if(!existing){const {preview}=await import(pathToFileURL(require.resolve('vite')).href);
    server=await preview({preview:{host:'127.0.0.1',port:5191,strictPort:true,open:false}});}
}
const browser=await pw.chromium.launch({headless:true});
const report={status:'RUNNING',base,mode,audits:[],checks:[],errors:[]};
await writeFile(join(output,`${mode}.json`),JSON.stringify(report));
const audit=()=>{
  const colorCache=new Map();const canvas=document.createElement('canvas');canvas.width=canvas.height=1;const ctx=canvas.getContext('2d');
  const rgb=s=>{if(colorCache.has(s))return [...colorCache.get(s)];ctx.clearRect(0,0,1,1);ctx.fillStyle=s;ctx.fillRect(0,0,1,1);const a=[...ctx.getImageData(0,0,1,1).data];a[3]/=255;colorCache.set(s,a);return [...a]};
  const blend=(a,b)=>[...a.slice(0,3).map((v,i)=>v*a[3]+b[i]*(1-a[3])),1];
  const lum=c=>c.slice(0,3).map(v=>v/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4).reduce((s,v,i)=>s+v*[.2126,.7152,.0722][i],0);
  const groups=new Map();
  for(const el of document.querySelectorAll('body *')){
    if(![...el.childNodes].some(n=>n.nodeType===3&&n.textContent.trim())||el.closest('svg,[aria-hidden="true"],button:disabled'))continue;
    const s=getComputedStyle(el),r=el.getBoundingClientRect();
    if(!r.width||!r.height||s.visibility==='hidden'||s.display==='none')continue;
    let bg=[255,255,255,1],opacity=1,uncertain=false;
    const ancestors=[];for(let p=el;p;p=p.parentElement)ancestors.unshift(p);
    for(const p of ancestors){const ps=getComputedStyle(p);bg=blend(rgb(ps.backgroundColor),bg);opacity*=Number(ps.opacity);if(ps.backgroundImage!=='none')uncertain=true;}
    if(opacity<.95)continue;
    const fg=rgb(s.color);fg[3]*=opacity;
    const l1=lum(blend(fg,bg)),l2=lum(bg),ratio=(Math.max(l1,l2)+.05)/(Math.min(l1,l2)+.05);
    const large=parseFloat(s.fontSize)>=24||(parseFloat(s.fontSize)>=18.66&&Number(s.fontWeight)>=700);
    if(ratio+0.01>=(large?3:4.5))continue;
    const selector=el.tagName.toLowerCase()+'.'+[...el.classList].join('.');
    const parent=el.parentElement?.className;
    const key=selector+'|'+parent+'|'+s.color+'|'+bg.slice(0,3).join(',');
    if(!groups.has(key))groups.set(key,{selector,parent,path:ancestors.slice(-5).map(p=>p.tagName.toLowerCase()+'.'+[...p.classList].join('.')).join(' > '),color:s.color,bg,ratio:+ratio.toFixed(2),size:s.fontSize,opacity,backgroundImage:uncertain,text:el.textContent.trim().slice(0,90),count:0});
    groups.get(key).count++;
  }
  return [...groups.values()].sort((a,b)=>a.ratio-b.ratio);
};
try{
  const context=await browser.newContext({viewport:{width:1366,height:768},colorScheme:'light'});
  const page=await context.newPage();
  const settleImages=async p=>p.evaluate(()=>Promise.all([...document.images].filter(i=>{const r=i.getBoundingClientRect();return r.bottom>0&&r.top<innerHeight}).map(i=>i.decode().catch(()=>{}))));
  const go=async route=>{await page.goto(base+route,{waitUntil:'domcontentloaded'});await page.locator('.ia-main').waitFor();await page.evaluate(()=>document.fonts.ready);};
  await go('/shop/');
  const grid=page.locator('.product-browser-grid').first();
  await grid.locator('[data-product-expand]').first().scrollIntoViewIfNeeded();
  await grid.locator('[data-product-expand]').first().click();
  await page.waitForTimeout(350);
  await page.screenshot({path:join(output,`${mode}-panel.png`)});
  await page.evaluate(()=>window.scrollTo({top:0,behavior:'instant'}));
  await page.waitForTimeout(200);
  await page.screenshot({path:join(output,`${mode}-hero.png`)});
  report.checks.push({name:'panel-at-hero',visible:await page.locator('.product-browser-details').isVisible(),position:await page.locator('.product-browser-details').evaluate(e=>getComputedStyle(e).position)});
  if(mode!=='before'){
    assert.equal(await page.locator('.product-browser-details').evaluate(e=>getComputedStyle(e).position),'static');
    assert.equal(await page.locator('.product-browser-details').evaluate(e=>e.getBoundingClientRect().bottom<0||e.getBoundingClientRect().top>=innerHeight),true,'panel must scroll with its grid');
  }
  await page.keyboard.press('Escape');
  if(mode!=='before'){
    const verifyGrid=async(p,width,height,highlights,index)=>{
      await p.setViewportSize({width,height});await p.goto(base+'/shop/',{waitUntil:'domcontentloaded'});await p.locator('[data-product-expand]').first().waitFor();await p.evaluate(()=>document.fonts.ready);
      const show=p.getByRole('button',{name:'Show highlights',exact:true}),hide=p.getByRole('button',{name:'Hide highlights',exact:true});
      if(highlights&&await show.count())await show.click();
      if(!highlights&&await hide.count())await hide.click();
      await p.waitForTimeout(300);
      const trigger=p.locator('[data-product-expand]').nth(index);const id=await trigger.getAttribute('data-product-expand');
      await trigger.evaluate(e=>{const header=parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--site-header-height'))||0;scrollTo({top:e.getBoundingClientRect().top+scrollY-header-16,behavior:'instant'})});
      await p.waitForTimeout(200);
      const y=await p.evaluate(()=>scrollY),clickedBox=await trigger.boundingBox();
      await trigger.click();await p.waitForTimeout(350);
      assert.ok(Math.abs(await p.evaluate(()=>scrollY)-y)<2,'opening must not scroll the document');
      const panel=p.locator('.product-browser-details');
      const metrics=await panel.evaluate(e=>{
        const r=e.getBoundingClientRect(),grid=e.parentElement,cols=getComputedStyle(grid).gridTemplateColumns.split(' ').length;
        const rows=new Map();for(const c of grid.children){const cr=c.getBoundingClientRect(),key=Math.round(cr.top);rows.set(key,(rows.get(key)||0)+(c===e?Math.min(cols,cols===2?2:3):1))}
        const module=e.firstElementChild,m=module.getBoundingClientRect();
        return {cols,position:getComputedStyle(e).position,insideGrid:grid.classList.contains('product-browser-grid'),x:r.x,y:r.y,width:r.width,height:r.height,header:parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--site-header-height')),holes:[...rows.entries()].slice(0,-1).filter(([,count])=>count!==cols),clipped:[...module.querySelectorAll('header,p,dl,.product-expanded-module__actions,.product-expanded-module__similar')].filter(n=>{const b=n.getBoundingClientRect();return b.bottom>m.bottom+2||b.right>m.right+2||n.scrollWidth>n.clientWidth+2}).map(n=>n.className||n.tagName)};
      });
      assert.equal(metrics.position,'static');assert.equal(metrics.insideGrid,true);assert.deepEqual(metrics.holes,[],'dense placement must fill spare grid cells');assert.deepEqual(metrics.clipped,[],'all product details must fit');
      assert.ok(Math.abs(metrics.y-clickedBox.y)<2,'expansion must stay in the clicked row, including at the right edge');
      assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
      if(width>=981)assert.ok(metrics.height<=height-metrics.header-30,'desktop panel must fit the available viewport height');
      // Put the navigation control on screen before measuring a click. Mobile
      // details naturally require reading down the document; this is test setup.
      await p.getByRole('button',{name:/^Next product:/}).scrollIntoViewIfNeeded();
      const switchY=await p.evaluate(()=>scrollY),box=await panel.boundingBox();
      await p.getByRole('button',{name:/^Next product:/}).click();await p.waitForTimeout(100);
      assert.ok(Math.abs(await p.evaluate(()=>scrollY)-switchY)<2,'switch must not scroll');
      assert.equal((await panel.boundingBox()).y,box.y);
      await p.locator('.product-expanded-module__similar button').first().scrollIntoViewIfNeeded();
      const similarY=await p.evaluate(()=>scrollY);
      await p.locator('.product-expanded-module__similar button').first().click();await p.waitForTimeout(100);
      assert.ok(Math.abs(await p.evaluate(()=>scrollY)-similarY)<2,'similar product must not scroll');
      if(width===1366&&highlights){await settleImages(p);await p.screenshot({path:join(output,`${mode}-inline.png`)});}
      if(width===390){await panel.evaluate(e=>scrollTo({top:e.getBoundingClientRect().top+scrollY-142,behavior:'instant'}));await p.screenshot({path:join(output,`${mode}-mobile.png`)});}
      const closeY=await p.evaluate(()=>scrollY);await p.keyboard.press('Escape');await p.waitForTimeout(100);
      assert.equal(await panel.count(),0);assert.ok(Math.abs(await p.evaluate(()=>scrollY)-closeY)<2,'close must not scroll');
      assert.equal(await p.locator(`[data-product-expand="${id}"]`).count(),1);
      report.checks.push({name:'inline-grid',viewport:{width,height},highlights,index,...metrics});
    };
    for(const [w,h] of [[1366,768],[1920,1080],[1024,768],[1280,720],[390,844]])await verifyGrid(page,w,h,w>980,1);
    await verifyGrid(page,1366,768,false,4);
    await verifyGrid(page,1366,768,true,9);
    const safari=await pw.webkit.launch({headless:true});
    try{const p=await safari.newPage();await verifyGrid(p,1366,768,true,1);await p.close()}finally{await safari.close()}
    await page.setViewportSize({width:1366,height:768});
    await go('/shop/');await page.waitForTimeout(300);
    await page.locator('[data-product-expand]').first().evaluate(e=>{const h=parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--site-header-height'))||0;scrollTo({top:e.getBoundingClientRect().top+scrollY-h-16,behavior:'instant'})});
    await page.waitForTimeout(200);
    const target=await page.locator('[data-product-expand]').first().boundingBox();await page.mouse.move(target.x+20,target.y+30);
    const start=await page.evaluate(()=>scrollY);await page.mouse.wheel(0,120);await page.waitForTimeout(160);const middle=await page.evaluate(()=>scrollY);await page.waitForTimeout(450);const end=await page.evaluate(()=>scrollY);
    assert.ok(start<middle&&middle<end,'row scrolling must animate');report.checks.push({name:'smooth-wheel',start,middle,end});
  }
  for(const theme of ['light','dark']){
    await page.addInitScript(theme=>localStorage.setItem('nk-color-theme',theme),theme);
    for(const route of ['/','/shop/','/shop/catalogues/','/shop/appliances/','/services/','/services/lighting-design/','/projects/','/about/','/contact/','/request-a-quote/']){
      await go(route);
      await page.evaluate(async()=>{for(let y=0;y<document.body.scrollHeight;y+=700){window.scrollTo(0,y);await new Promise(r=>setTimeout(r,15));}window.scrollTo(0,0)});
      await page.waitForTimeout(500);
      report.audits.push({route,theme,failures:await page.evaluate(audit)});
      if(route==='/shop/'){
        const hide=page.getByRole('button',{name:'Hide highlights',exact:true});if(await hide.count())await hide.click();await page.waitForTimeout(300);
        await page.locator('.compact-filter-panel').first().evaluate(e=>{const h=parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--site-header-height'))||0;scrollTo({top:e.getBoundingClientRect().top+scrollY-h-16,behavior:'instant'})});
        await settleImages(page);await page.screenshot({path:join(output,`${mode}-filters-${theme}.png`)});
      }
    }
  }
  if(mode!=='before'){
    const failures=report.audits.flatMap(a=>a.failures.map(f=>({route:a.route,theme:a.theme,...f})));
    assert.deepEqual(failures,[],'review and correct all contrast candidates');
    for(const route of ['/shop/','/contact/','/request-a-quote/']){
      await page.setViewportSize({width:390,height:844});await go(route);await page.waitForTimeout(400);
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,`mobile overflow: ${route}`);
      report.checks.push({name:'mobile-route-overflow',route});
    }
  }
  report.status='PASS';
}catch(e){report.status='FAIL';report.errors.push(e.stack);process.exitCode=1}
finally{await browser.close();await server?.httpServer.close();await writeFile(join(output,`${mode}.json`),JSON.stringify(report,null,2));console.log(JSON.stringify({status:report.status,errors:report.errors,failures:report.audits.map(x=>({route:x.route,theme:x.theme,count:x.failures.length}))}));}
