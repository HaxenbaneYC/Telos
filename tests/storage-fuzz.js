// Corrupt localStorage must never stop the app opening: wrong types for every state key, raw junk, storage that throws.
//   node tests/storage-fuzz.js [coach.html]   (needs Playwright)
const { chromium } = require('playwright');
const F='file://'+require('path').resolve(process.argv[2]||require('path').join(__dirname,'..','coach.html')), KEY='telos_v2';
const VP="document.addEventListener('DOMContentLoaded',()=>{const m=document.createElement('meta');m.name='viewport';m.content='width=device-width, initial-scale=1, viewport-fit=cover';document.head.appendChild(m);});";
const D='2026-10-28';
const keys=['weights','eggs','ticks','extras','picks','done','snap','skip','skipped','meas','sleep','photos','seenWk'];
const bad=[null,5,'x',[],[1],{},{[D]:5},{[D]:'x'},{[D]:null},{[D]:[null]},{[D]:{m1:null}},{[D]:{m1:5}},{[D]:[{}]},{[D]:[{n:null,k:'x'}]}];
const raws=['{bad','null','5','"str"','true','[]','[1,2]','{}','{"weights":[1],"ticks":"x"}'];
(async()=>{const b=await chromium.launch();
async function trial(name,init,after){
  const ctx=await b.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});await ctx.addInitScript(VP);await ctx.addInitScript(init);
  const p=await ctx.newPage();const errs=new Set();p.on('pageerror',e=>errs.add(String(e).split('\n')[0].slice(0,110)));
  try{await p.goto(F);await p.waitForTimeout(500);
    const ok=await p.$eval('#rLeft',e=>/\d/.test(e.textContent)).catch(()=>false);
    for(const t of ['train','food','trend','today']){await p.evaluate(t=>{const b=document.querySelector('nav [data-tab='+t+']');b&&b.click()},t);await p.waitForTimeout(150)}
    await p.evaluate(()=>{const e=document.querySelector('.mslot.next [data-open]');e&&e.click()});await p.waitForTimeout(250);
    await p.evaluate(()=>{const e=document.querySelector('[data-close]');e&&e.click()});await p.waitForTimeout(250);
    await p.evaluate(()=>{const e=document.querySelector('#offplan [data-sheet=add]');e&&e.click()});await p.waitForTimeout(250);
    await p.evaluate(()=>{const e=document.querySelector('[data-close]');e&&e.click()});
    await p.evaluate(()=>{const e=document.querySelector('.mslot.next .bigbtn:not(.skip)');e&&e.click()});await p.waitForTimeout(300);
    if(!ok||errs.size) console.log((ok?'ERR ':'BLANK ')+name+' -> '+[...errs].join(' | '));
  }catch(e){console.log('HARNESS',name,String(e).slice(0,80))}
  await ctx.close();}
for(const r of raws) await trial('raw '+JSON.stringify(r),`try{localStorage.setItem(${JSON.stringify(KEY)},${JSON.stringify(r)})}catch(e){}`);
for(const k of keys) for(const v of bad) await trial(k+' = '+JSON.stringify(v),`try{localStorage.setItem(${JSON.stringify(KEY)},JSON.stringify({${JSON.stringify(k)}:${JSON.stringify(v)}}))}catch(e){}`);
await trial('storage throws on read',`Object.defineProperty(window,'localStorage',{get(){throw new Error('denied')}})`);
await trial('storage throws on write',`Storage.prototype.setItem=function(){throw new DOMException('full','QuotaExceededError')}`);
console.log('fuzz done');await b.close();})();
