// Hostile text (stored, typed, or returned by Claude) must never run as markup.
//   node tests/injection.js [coach.html]   (needs Playwright)
const { chromium } = require('playwright');
const F='file://'+require('path').resolve(process.argv[2]||require('path').join(__dirname,'..','coach.html'));
const VP="document.addEventListener('DOMContentLoaded',()=>{const m=document.createElement('meta');m.name='viewport';m.content='width=device-width, initial-scale=1, viewport-fit=cover';document.head.appendChild(m);});";
const P1='"><img src=x onerror=window.__x=1>', P2='<img src=x onerror=window.__x=2>', P3="'><svg onload=window.__x=3>";
const D=new Date().toISOString().slice(0,10);
(async()=>{const b=await chromium.launch();
// 1. hostile stored strings
const st={extras:{[D]:[{n:P1,k:100,p:1,f:1,c:1,src:P2},{n:P2,k:50,p:0,f:0,c:0,src:'label'}]},
  picks:{m1:{protein:P1,carb:P2}},done:{m2:P3},eggs:{m1:3},
  snap:{[D]:{m1:{tot:{k:300,p:20,f:10,c:10},parts:[{n:P1,name:P2,noun:P3,sub:P1,g:50,cat:P1}]}}},
  ticks:{[D]:{m1:true}},photos:[{d:P1,src:'data:image/jpeg;base64,AAAA'}],weights:{[D]:75},meas:{[D]:{w:75,s:100}}};
let ctx=await b.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});await ctx.addInitScript(VP);
await ctx.addInitScript(`try{localStorage.setItem('telos_v1',${JSON.stringify(JSON.stringify(st))})}catch(e){}`);
let p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(String(e).slice(0,100)));
await p.goto(F);await p.waitForTimeout(600);
for(const t of ['train','food','trend','today']){await p.evaluate(t=>document.querySelector('nav [data-tab='+t+']').click(),t);await p.waitForTimeout(200)}
await p.evaluate(()=>{const e=document.querySelector('#offplan [data-sheet=add]');e&&e.click()});await p.waitForTimeout(300);
console.log('stored payloads  -> executed:',await p.evaluate(()=>window.__x||'no'),'| injected <img onerror>/<svg>:',await p.$$eval('img[onerror],svg[onload]',e=>e.length),'| errors',errs);
await ctx.close();
// 2. hostile text typed into forms + Claude replies
ctx=await b.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});await ctx.addInitScript(VP);
await ctx.addInitScript(`window.claude={use:async(n)=>{if(n!=='sample')return null;const f=async()=>({text:''});f.json=async()=>({name:${JSON.stringify(P1)},brand:${JSON.stringify(P2)},product:${JSON.stringify(P3)},kcal:100,protein:1,fat:1,carbs:1,per100:{kcal:100,protein:1,fat:1,carbs:1},per:{kcal:100,protein:1,fat:1,carbs:1},servingSize:${JSON.stringify(P1)},servingUnit:${JSON.stringify(P2)},note:${JSON.stringify(P2)}});f.limits=async()=>({images:true});return f}}`);
p=await ctx.newPage();const e2=[];p.on('pageerror',e=>e2.push(String(e).slice(0,100)));
await p.goto(F);await p.waitForTimeout(700);
await p.evaluate(()=>document.querySelector('#offplan [data-sheet=add]').click());await p.waitForTimeout(500);
await p.evaluate(()=>document.querySelector('.segb[data-tab=num]').click());await p.waitForTimeout(200);
await p.fill('#fName',P1);await p.fill('#fKcal','120');await p.evaluate(()=>document.getElementById('fAdd').click());await p.waitForTimeout(500);
await p.evaluate(()=>document.querySelector('#offplan [data-sheet=add]').click());await p.waitForTimeout(500);
for(const tab of ['desc','photo']){await p.evaluate(t=>{const e=document.querySelector('.segb[data-tab='+t+']');e&&e.click()},tab);await p.waitForTimeout(200);}
await p.evaluate(()=>{const e=document.querySelector('.segb[data-tab=desc]');e&&e.click()});await p.waitForTimeout(200);
const dt=await p.$('#dText');if(dt){await dt.fill(P1);await p.evaluate(()=>document.getElementById('dGo').click());await p.waitForTimeout(700);}
console.log('typed + Claude   -> executed:',await p.evaluate(()=>window.__x||'no'),'| injected:',await p.$$eval('img[onerror],svg[onload]',e=>e.length),'| errors',e2);
console.log('Today row text   :',await p.$$eval('#offplan .xrow',r=>r.map(x=>x.innerHTML.slice(0,140))));
await b.close();})();
