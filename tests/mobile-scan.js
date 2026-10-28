// Touch targets under 44 px and horizontal overflow at 320, 360 and 390 px across every screen and sheet.
//   node tests/mobile-scan.js [coach-preview.html]   (needs Playwright; the preview build has sample data)
const { chromium } = require('playwright');
const F='file://'+require('path').resolve(process.argv[2]||require('path').join(__dirname,'..','coach-preview.html'));
const VP="document.addEventListener('DOMContentLoaded',()=>{const m=document.createElement('meta');m.name='viewport';m.content='width=device-width, initial-scale=1, viewport-fit=cover';document.head.appendChild(m);});";
const MOCK="window.claude={use:async(n)=>{if(n!=='sample')return null;const f=async()=>({text:''});f.json=async()=>({});f.limits=async()=>({images:true});return f}}";
const SCAN=()=>{
  const out={small:[],over:[]};const W=innerWidth;
  const vis=e=>{const r=e.getBoundingClientRect(),s=getComputedStyle(e);return r.width>0&&r.height>0&&s.visibility!=='hidden'&&s.display!=='none'&&s.opacity!=='0'};
  const inScope=e=>{ // ignore anything under a hidden view or behind the closed sheet
    for(let p=e;p&&p!==document.body;p=p.parentElement){if(p.hidden)return false;const s=getComputedStyle(p);if(s.display==='none'||s.visibility==='hidden')return false}
    return true};
  document.querySelectorAll('button,a[href],input:not([type=hidden]),select,textarea,[role=tab],label.photobtn,summary').forEach(e=>{
    if(!inScope(e)||!vis(e))return; if(e.classList.contains('vh')) return;
    const r=e.getBoundingClientRect();
    // a label that wraps its input counts as the target
    if(r.top>innerHeight+2000)return;
    if(r.width<44||r.height<44)out.small.push((e.tagName+'.'+(e.className||'').toString().split(' ')[0]+(e.id?'#'+e.id:'')+(e.getAttribute('aria-label')?'['+e.getAttribute('aria-label').slice(0,24)+']':e.textContent.trim()?'['+e.textContent.trim().slice(0,18)+']':''))+' '+Math.round(r.width)+'x'+Math.round(r.height));
  });
  document.querySelectorAll('main *, #panel *, nav *, header *').forEach(e=>{
    if(!inScope(e)||!vis(e))return;const r=e.getBoundingClientRect();
    if(r.right>W+1||r.left<-1){ if(!e.closest('.chips,.tbl,svg,.sheetwrap:not(.open),[style*="overflow"]')&&!(e.closest('.chips')))out.over.push(e.tagName+'.'+(e.className||'').toString().split(' ')[0]+' '+Math.round(r.left)+'..'+Math.round(r.right))}
  });
  out.docOver=document.documentElement.scrollWidth>W||document.body.scrollWidth>W;
  return out};
(async()=>{const b=await chromium.launch();const seen={};
for(const [w,h] of [[320,568],[360,740],[390,844]]){
 const ctx=await b.newContext({viewport:{width:w,height:h},isMobile:true,hasTouch:true,deviceScaleFactor:1});await ctx.addInitScript(VP);await ctx.addInitScript(MOCK);
 const p=await ctx.newPage();await p.goto(F);await p.waitForTimeout(800);
 const states=[
  ['today',async()=>{}],
  ['today-sumopen',async()=>{await p.evaluate(()=>{const b=document.getElementById('sumToggle');b&&b.offsetParent&&b.click()})}],
  ['meal-sheet',async()=>{await p.evaluate(()=>document.querySelector('.mslot.next [data-open]').click());await p.waitForTimeout(500)}],
  ['meal-pick',async()=>{await p.evaluate(()=>{const e=document.querySelector('#panel [data-cat]');e&&e.click()});await p.waitForTimeout(300)}],
  ['close',async()=>{await p.evaluate(()=>document.querySelector('[data-close]').click());await p.waitForTimeout(400)}],
  ['add-search',async()=>{await p.evaluate(()=>document.querySelector('#offplan [data-sheet=add]').click());await p.waitForTimeout(500);await p.fill('#qIn','orange juice');await p.waitForTimeout(400)}],
  ['add-picked',async()=>{await p.evaluate(()=>document.querySelector('[data-hit="0"]').click());await p.waitForTimeout(600)}],
  ['add-numbers',async()=>{await p.evaluate(()=>{document.querySelector('[data-unpick]').click()});await p.waitForTimeout(200);await p.evaluate(()=>document.querySelector('.segb[data-tab=num]').click());await p.waitForTimeout(300)}],
  ['add-desc',async()=>{await p.evaluate(()=>document.querySelector('.segb[data-tab=desc]').click());await p.waitForTimeout(300)}],
  ['add-label',async()=>{await p.evaluate(()=>document.querySelector('.segb[data-tab=photo]').click());await p.waitForTimeout(300)}],
  ['close2',async()=>{await p.evaluate(()=>document.querySelector('[data-close]').click());await p.waitForTimeout(400)}],
  ['today-scrolled',async()=>{await p.evaluate(()=>document.getElementById('main').scrollTo(0,99999));await p.waitForTimeout(300)}],
  ['train',async()=>{await p.evaluate(()=>document.querySelector('nav [data-tab=train]').click());await p.waitForTimeout(400)}],
  ['food',async()=>{await p.evaluate(()=>document.querySelector('nav [data-tab=food]').click());await p.waitForTimeout(400)}],
  ['food-open',async()=>{await p.evaluate(()=>document.querySelector('#recipes .acc-h').click());await p.waitForTimeout(400)}],
  ['trend',async()=>{await p.evaluate(()=>document.querySelector('nav [data-tab=trend]').click());await p.waitForTimeout(500)}],
  ['trend-open',async()=>{await p.evaluate(()=>{document.querySelectorAll('#v-trend .acc-h').forEach(x=>x.click())});await p.waitForTimeout(500)}],
 ];
 for(const [n,fn] of states){try{await fn()}catch(e){console.log('step fail',w,n,String(e).slice(0,60));continue}
  const r=await p.evaluate(SCAN);
  r.small.forEach(s=>{(seen['S '+s.replace(/ \d+x\d+$/,'')]=seen['S '+s.replace(/ \d+x\d+$/,'')]||new Set()).add(w+'px '+n+' '+s.match(/\d+x\d+$/)[0])});
  r.over.forEach(s=>{(seen['O '+s.replace(/ -?\d+\.\.\d+$/,'')]=seen['O '+s.replace(/ -?\d+\.\.\d+$/,'')]||new Set()).add(w+'px '+n+' '+s.match(/-?\d+\.\.\d+$/)[0])});
  if(r.docOver)(seen['DOC overflow']=seen['DOC overflow']||new Set()).add(w+'px '+n);
 }
 await ctx.close();}
for(const [k,v] of Object.entries(seen)){const a=[...v];console.log(k,'  <-',a.slice(0,3).join(' ; ')+(a.length>3?' (+'+(a.length-3)+')':''))}
console.log('scan done');await b.close();})();
